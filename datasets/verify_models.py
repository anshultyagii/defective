#!/usr/bin/env python3
"""
verify_synthetic_suite.py
Automated benchmark and verification suite to test the Burn-In Screening ML models
and frontend parser against the synthetic datasets.
"""

import os
import csv
import json
import urllib.request

BACKEND_URL = "http://127.0.0.1:8000/api/v1/screening/batch-csv"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def post_file(file_path):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    filename = os.path.basename(file_path)
    
    with open(file_path, "rb") as f:
        file_content = f.read()
        
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
    ).encode("utf-8") + file_content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    
    req = urllib.request.Request(
        BACKEND_URL,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_benchmark_50():
    filepath = os.path.join(BASE_DIR, "01_ML_Model_Benchmark_Suite", "01_Model_Verification_50_Components.csv")
    print("=" * 85)
    print("SUITE 1: ML MODEL BENCHMARK (50 Components — Multi-Lot Production Verification)")
    print("=" * 85)
    
    ground_truth = {}
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            ground_truth[r["component_id"]] = {
                "expected": r["expected_decision"],
                "label": r["ground_truth_label"],
                "mechanism": r["failure_mechanism"]
            }
            
    res_json = post_file(filepath)
    results = res_json.get("results", [])
    summary = res_json.get("summary", {})
    
    tp, fp, tn, fn = 0, 0, 0, 0
    detailed = []
    
    for r in results:
        cid = r["component_id"]
        pred = r["final_decision"]
        gt = ground_truth.get(cid, {})
        exp = gt.get("expected", "UNKNOWN")
        
        is_tp = pred == "FLAG" and exp == "FLAG"
        is_tn = pred == "PASS" and exp == "PASS"
        is_fp = pred == "FLAG" and exp == "PASS"
        is_fn = pred == "PASS" and exp == "FLAG"
        
        if is_tp: tp += 1
        elif is_tn: tn += 1
        elif is_fp: fp += 1
        elif is_fn: fn += 1
        
        icon = "PASS [✓]" if (is_tp or is_tn) else "FAIL [✗]"
        detailed.append((cid, exp, pred, r.get("risk_level", "LOW"), icon, gt.get("mechanism", "")))
        
    total = len(results)
    acc = ((tp + tn) / total) * 100 if total else 0
    prec = (tp / (tp + fp)) * 100 if (tp + fp) else 0
    rec = (tp / (tp + fn)) * 100 if (tp + fn) else 0
    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) else 0
    
    print(f"Total Components Screened : {total}")
    print(f"Passed Units (Certified) : {summary.get('pass_count', 0)}")
    print(f"Flagged Units (Anomalies) : {summary.get('flag_count', 0)}")
    print("\n--- CONFUSION MATRIX ---")
    print(f"  True Positives  (Defects correctly rejected) : {tp:2d} / 20")
    print(f"  True Negatives  (Healthy certified)          : {tn:2d} / 30")
    print(f"  False Positives (False alarms)               : {fp:2d}")
    print(f"  False Negatives (Missed defects)             : {fn:2d}")
    print("\n--- MODEL PERFORMANCE METRICS ---")
    print(f"  Classification Accuracy : {acc:6.2f}%")
    print(f"  Precision Rate          : {prec:6.2f}%")
    print(f"  Recall (Detection Rate) : {rec:6.2f}%")
    print(f"  F1-Score                : {f1:6.2f}%")
    
    print("\n--- SAMPLE COMPONENT VERIFICATION LOGS ---")
    print(f"{'Component ID':<28} | {'Ground Truth':<12} | {'ML Decision':<12} | {'Risk Level':<10} | {'Status':<10} | {'Failure Mode'}")
    print("-" * 110)
    # Print sample from each group
    for row in detailed[0:4] + detailed[30:33] + detailed[40:42] + detailed[46:50]:
        print(f"{row[0]:<28} | {row[1]:<12} | {row[2]:<12} | {row[3]:<10} | {row[4]:<10} | {row[5]}")

def test_edge_cases():
    filepath = os.path.join(BASE_DIR, "01_ML_Model_Benchmark_Suite", "02_Stress_Test_Edge_Cases.csv")
    print("\n" + "=" * 85)
    print("SUITE 2: EDGE CASES & BOUNDARY TESTS (Stress Testing)")
    print("=" * 85)
    
    ground_truth = {}
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            ground_truth[r["component_id"]] = {
                "expected": r["expected_decision"],
                "desc": r["edge_case_description"]
            }
            
    res_json = post_file(filepath)
    results = res_json.get("results", [])
    
    print(f"{'Component ID':<28} | {'Expected':<10} | {'Predicted':<10} | {'Result':<8} | {'Edge Case Description'}")
    print("-" * 95)
    for r in results:
        cid = r["component_id"]
        pred = r["final_decision"]
        gt = ground_truth.get(cid, {})
        exp = gt.get("expected", "UNKNOWN")
        match = "✓ MATCH" if pred == exp else "✗ DIFF"
        print(f"{cid:<28} | {exp:<10} | {pred:<10} | {match:<8} | {gt.get('desc', '')}")

def test_zero_nominal():
    filepath = os.path.join(BASE_DIR, "01_ML_Model_Benchmark_Suite", "03_Zero_Nominal_Fleet_100pct_Flagged_Lot.csv")
    print("\n" + "=" * 85)
    print("SUITE 3: ZERO NOMINAL FLEET STRESS TEST (100% Flagged Lot — 0 Pass Verification)")
    print("=" * 85)

    res_json = post_file(filepath)
    summary = res_json.get("summary", {})
    results = res_json.get("results", [])

    total = summary.get("total_components", len(results))
    passed = summary.get("pass_count", 0)
    flagged = summary.get("flag_count", 0)

    print(f"Total Components Tested: {total}")
    print(f"Pass Count (Nominal):    {passed} (Expected: 0)")
    print(f"Flag Count (Rejected):   {flagged} (Expected: {total})")
    
    status_match = "✓ PASS (Zero Nominal Fleet Verified)" if passed == 0 and flagged == total else "✗ FAIL"
    print(f"Benchmark Verification:  {status_match}")

def test_time_series():
    print("\n" + "=" * 85)
    print("SUITE 4: TIME-SERIES CONTINUOUS STREAMS (168h Ingestion)")
    print("=" * 85)
    
    series_files = [
        ("DUT_01_Golden_Healthy_168h.csv", "Golden Certified", "PASS"),
        ("DUT_02_Thermal_Overstress_Short_168h.csv", "Thermal Short-Circuit", "FLAG"),
        ("DUT_03_Latent_Wearout_Drift_168h.csv", "Latent Wear-Out", "FLAG"),
        ("DUT_04_Gate_Oxide_Rupture_168h.csv", "Gate Oxide Rupture", "FLAG"),
    ]
    
    print(f"{'Dataset Name':<42} | {'Expected':<8} | {'Decision':<8} | {'Checkpoints':<11} | {'Peak Temp':<10} | {'Status'}")
    print("-" * 95)
    for fname, desc, expected in series_files:
        fpath = os.path.join(BASE_DIR, "02_Time_Series_Telemetry_Suite", fname)
        res_json = post_file(fpath)
        results = res_json.get("results", [])
        last_item = results[-1] if results else {}
        is_flagged = any(r.get("final_decision") == "FLAG" for r in results)
        decision = "FLAG" if is_flagged else "PASS"
        match = "✓ PASS" if decision == expected else "✗ DIFF"
        max_t = max([r.get("max_temp_early", 0) for r in results]) if results else 0
        print(f"{fname:<42} | {expected:<8} | {decision:<8} | {len(results):<11} | {max_t:<9.1f}C | {match}")

if __name__ == "__main__":
    test_benchmark_50()
    test_edge_cases()
    test_zero_nominal()
    test_time_series()
    print("\n" + "=" * 85)
    print("ALL VERIFICATION SUITES COMPLETED")
    print("=" * 85)
