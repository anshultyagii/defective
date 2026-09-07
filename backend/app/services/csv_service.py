import csv
import io
import math

from app.schemas.screening import ScreeningRequest


class CSVService:

    REQUIRED_COLUMNS = [
        "component_id",
        "lot_id",
        "value_0h",
        "value_24h",
        "value_96h"
    ]

    def parse_csv(self, file_content: bytes):

        # Decode uploaded CSV
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_content.decode("latin-1")
            except Exception:
                raise ValueError("CSV file must be UTF-8 or Latin-1 encoded.")

        # Read CSV
        reader = csv.DictReader(io.StringIO(text))

        # Check headers
        if reader.fieldnames is None:
            raise ValueError("CSV file does not contain headers.")

        raw_fieldnames = [f for f in reader.fieldnames if f]
        field_map = {f.strip().lower(): f for f in raw_fieldnames}

        def find_field(candidates):
            for c in candidates:
                if c.lower() in field_map:
                    return field_map[c.lower()]
            for c in candidates:
                cl = c.lower()
                for f in field_map:
                    if cl in f:
                        return field_map[f]
            return None

        # Check if this file is a continuous time-series stream of a single device
        col_time = find_field(["aging_hours", "run_elapsed_seconds", "elapsed_seconds", "timestamp", "datetime", "time"])
        col_rds = find_field(["rds_on_ohm", "rds", "vds_v", "current_a", "leakage", "hi_rds"])
        col_temp = find_field(["package_temp_c", "flange_temp_c", "delta_temp_24h_c", "delta_temp_0h_c", "max_temp_early", "temperature", "temp", "temp_c", "chamber_temp"])
        col_comp = find_field(["component_id", "device_id", "component", "dut_id", "part_id", "serial_number", "serial", "id", "unit_id", "dut"])
        col_lot = find_field(["aging_category", "lot_id", "lot", "batch_id", "batch", "lot_number", "wafer_id", "wafer", "run_id"])

        rows = list(reader)
        if not rows:
            raise ValueError("CSV file contains no component records.")

        is_continuous_stream = (
            col_time is not None and
            col_rds is not None and
            len(rows) > 30 and
            find_field(["value_0h", "pristine_rds_0h_ohm"]) is None
        )

        if is_continuous_stream:
            # Extract distinct valid chronological checkpoints across this device's aging run
            valid_points = []
            dev_name = rows[0].get(col_comp) if col_comp else None
            dev_str = f"DUT-{dev_name}" if dev_name else "DUT-01"

            for r in rows:
                try:
                    p = float(r[col_rds])
                    if math.isnan(p) or p <= 0:
                        continue
                    t = 125.0
                    if col_temp and r.get(col_temp):
                        try:
                            t_cand = float(r[col_temp])
                            if not math.isnan(t_cand) and t_cand > -100:
                                t = t_cand
                        except:
                            pass
                    h = 0.0
                    if col_time and r.get(col_time):
                        try:
                            h = float(r[col_time])
                        except:
                            pass
                    valid_points.append({"param": p, "temp": t, "hours": h, "lot": r.get(col_lot, "LOT-MAIN")})
                except:
                    continue

            if len(valid_points) >= 3:
                p0 = valid_points[0]["param"]
                sample_count = min(8, len(valid_points))
                step_indices = [int(i * (len(valid_points) - 1) / (sample_count - 1)) for i in range(sample_count)]
                
                components = []
                for idx, pt_idx in enumerate(step_indices):
                    pt = valid_points[pt_idx]
                    hr = pt["hours"]
                    p_val = pt["param"]
                    t_val = pt["temp"]
                    p24_idx = step_indices[min(1, len(step_indices) - 1)]
                    p24 = valid_points[p24_idx]["param"]

                    # Peak temp up to this checkpoint
                    sub_pts = valid_points[: pt_idx + 1]
                    peak_t = max([x["temp"] for x in sub_pts], default=t_val)

                    checkpoint_id = f"{dev_str} @ {hr:.1f}h" if hr > 0 else f"{dev_str} (0h Baseline)"
                    components.append(
                        ScreeningRequest(
                            component_id=checkpoint_id,
                            lot_id=f"Aging Phase {idx + 1}",
                            value_0h=p0,
                            value_24h=p24,
                            value_96h=p_val,
                            max_temp_early=peak_t,
                        )
                    )
                return components

        # Standard Multi-Component / Screening Report handling
        col_0h = find_field(["pristine_rds_0h_ohm", "rds_0h", "value_0h", "value_0", "val_0h", "val_0", "0h", "hour_0", "t0", "initial_value", "baseline_rds_ohm"])
        col_24h = find_field(["screening_rds_24h_ohm", "rds_24h", "value_24h", "value_24", "val_24h", "val_24", "24h", "hour_24", "t24", "mid_value"])
        col_96h = find_field(["actual_groundtruth_rds_end_ohm", "predicted_rds_end_ohm", "predicted_168h_extrapolated_rds_ohm", "value_96h", "value_96", "val_96h", "val_96", "96h", "hour_96", "t96", "final_value", "rds_96h", "rds_end"])

        # Fallback to column position if named headers weren't matched
        if not col_0h or not col_24h or not col_96h:
            numeric_candidates = []
            for f in raw_fieldnames:
                is_num = True
                for r in rows[:5]:
                    val = r.get(f, "").strip()
                    try:
                        float(val)
                    except ValueError:
                        is_num = False
                        break
                if is_num:
                    numeric_candidates.append(f)

            if len(numeric_candidates) >= 3:
                col_0h = col_0h or numeric_candidates[0]
                col_24h = col_24h or numeric_candidates[1]
                col_96h = col_96h or numeric_candidates[2]

        if not col_0h or not col_24h or not col_96h:
            raise ValueError(
                f"Missing required telemetry columns (need readings at 0h, 24h, and 96h/end). Found: {raw_fieldnames}"
            )

        components = []
        for row_number, row in enumerate(rows, start=2):
            try:
                c_id = (row.get(col_comp) if col_comp else None) or f"DUT-{row_number - 1:03d}"
                l_id = (row.get(col_lot) if col_lot else None) or "LOT-MAIN"

                v0_str = row.get(col_0h, "")
                v24_str = row.get(col_24h, "")
                v96_str = row.get(col_96h, "")
                if not v0_str or not v24_str or not v96_str:
                    continue
                v0 = float(v0_str)
                v24 = float(v24_str)
                v96 = float(v96_str)
                if math.isnan(v0) or math.isnan(v24) or math.isnan(v96):
                    continue

                temp_val = 125.0
                if col_temp and row.get(col_temp):
                    try:
                        tv = float(row[col_temp])
                        if not math.isnan(tv) and tv > -100:
                            temp_val = tv
                    except:
                        pass

                component = ScreeningRequest(
                    component_id=str(c_id).strip(),
                    lot_id=str(l_id).strip(),
                    value_0h=v0,
                    value_24h=v24,
                    value_96h=v96,
                    max_temp_early=temp_val
                )
                components.append(component)
            except Exception:
                continue

        if not components:
            raise ValueError("CSV file contains no valid component records.")

        return components
