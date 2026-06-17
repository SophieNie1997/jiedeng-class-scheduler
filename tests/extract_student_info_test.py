import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from extract_student_info import extract_students_from_workbook  # noqa: E402


class ExtractStudentInfoTest(unittest.TestCase):
    def test_extracts_and_dedupes_students_with_contact_fields(self):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Sheet1"
        worksheet.append(["编号", "业务类型", "姓名", "性别", "年级", "学校", "上课频率", "电话", "地址"])
        worksheet.append(["1", "上门业务", "Eddie俞奕泽", "男", "Y3", "YCIS", "周三/周六", "13600000000", "上海"])
        worksheet.append(["2", "樱桃", "Eric", "男", "G2", "上实验国际部", "周一-周五", "13800000000", "浦东"])
        worksheet.append(["3", "上门业务", "王恣懿", "女", "Y6", "YCIS", "每周1-5", "13900000000", "徐汇"])

        member_sheet = workbook.create_sheet("⭐️会员信息录入")
        member_sheet.append(["孩子姓名", "性别", "孩子学校和年级", "当前主要需求陪伴板块", "电话号码 2"])
        member_sheet.append(["Eddie", "男", "YCIS Y3", "学科陪伴", "13600000000"])
        member_sheet.append(["ziyi", "女", "YCIS Y6", "阅读", "13900000000"])

        with tempfile.NamedTemporaryFile(suffix=".xlsx") as file:
            workbook.save(file.name)
            students = extract_students_from_workbook(Path(file.name))

        self.assertEqual([student["name"] for student in students], ["Eddie俞奕泽", "Eric", "王恣懿"])
        self.assertEqual(students[0]["grade"], "Y3")
        self.assertEqual(students[0]["school"], "YCIS")
        self.assertEqual(students[0]["needs"], "学科陪伴")
        self.assertEqual(students[0]["phone"], "13600000000")
        self.assertEqual(students[0]["address"], "上海")
        self.assertEqual(students[1]["businessType"], "樱桃")
        self.assertEqual(students[2]["needs"], "阅读")
        self.assertEqual(students[2]["phone"], "13900000000")
        self.assertEqual(students[2]["address"], "徐汇")


if __name__ == "__main__":
    unittest.main()
