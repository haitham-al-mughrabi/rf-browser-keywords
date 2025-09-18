"""
String utility functions for Robot Framework
"""

class StringUtils:

    def generate_random_string(self, length=10):
        """Generate random string of specified length"""
        import random
        import string
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

    def format_phone_number(self, phone_number):
        """Format phone number to standard format"""
        # Remove all non-numeric characters
        numeric_only = ''.join(filter(str.isdigit, phone_number))
        if len(numeric_only) == 10:
            return f"({numeric_only[:3]}) {numeric_only[3:6]}-{numeric_only[6:]}"
        return phone_number

    def validate_email_format(self, email):
        """Validate if email address has correct format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def extract_numbers_from_text(self, text):
        """Extract all numbers from text string"""
        import re
        return re.findall(r'\d+', text)