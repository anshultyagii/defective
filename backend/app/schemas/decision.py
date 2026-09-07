from enum import Enum


class Decision(str, Enum):
    PASS = "PASS"
    FLAG = "FLAG"
    PENDING = "PENDING"
    ERROR = "ERROR"
    