import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/sophienie/Downloads/暑假课程排课系统.xlsx")
MODULE_PATH = ROOT / "scripts" / "extract_summer_courses.py"


def load_module():
    spec = importlib.util.spec_from_file_location("extract_summer_courses", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class ExtractSummerCoursesTest(unittest.TestCase):
    def test_expands_excel_courses_into_lesson_instances(self):
        self.assertTrue(MODULE_PATH.exists(), "scripts/extract_summer_courses.py should exist")
        module = load_module()

        lessons = module.expand_lessons(SOURCE)

        self.assertEqual(len(lessons), 32)

    def test_eight_day_courses_use_tuesday_to_friday_for_two_weeks(self):
        self.assertTrue(MODULE_PATH.exists(), "scripts/extract_summer_courses.py should exist")
        module = load_module()

        lessons = module.expand_lessons(SOURCE)
        xuhui = [
            lesson
            for lesson in lessons
            if lesson["course"] == "财商x樱桃 徐汇暑期课"
        ]

        self.assertEqual(
            [lesson["date"] for lesson in xuhui],
            [
                "2026-07-07",
                "2026-07-08",
                "2026-07-09",
                "2026-07-10",
                "2026-07-14",
                "2026-07-15",
                "2026-07-16",
                "2026-07-17",
            ],
        )
        self.assertTrue(all(lesson["teacherId"] == "phebe" for lesson in xuhui))
        self.assertTrue(all(lesson["teacherName"] == "Phebe" for lesson in xuhui))
        self.assertTrue(all(lesson["startTime"] == "15:15" for lesson in xuhui))
        self.assertTrue(all(lesson["endTime"] == "16:15" for lesson in xuhui))
        self.assertTrue(all(lesson["campus"] == "徐汇" for lesson in xuhui))

    def test_waicy_uses_monday_wednesday_thursday_pattern(self):
        self.assertTrue(MODULE_PATH.exists(), "scripts/extract_summer_courses.py should exist")
        module = load_module()

        lessons = module.expand_lessons(SOURCE)
        waicy = [
            lesson
            for lesson in lessons
            if lesson["course"] == "WAICY 徐汇集训班"
        ]

        self.assertEqual(
            [lesson["date"] for lesson in waicy],
            [
                "2026-06-29",
                "2026-07-01",
                "2026-07-02",
                "2026-07-06",
                "2026-07-08",
                "2026-07-09",
                "2026-07-13",
                "2026-07-15",
            ],
        )
        self.assertTrue(all(lesson["teacherId"] == "sophie" for lesson in waicy))
        self.assertTrue(all(lesson["studentName"] == "Ivan,小米" for lesson in waicy))
        self.assertTrue(all(lesson["startTime"] == "15:30" for lesson in waicy))
        self.assertTrue(all(lesson["endTime"] == "18:30" for lesson in waicy))


if __name__ == "__main__":
    unittest.main()
