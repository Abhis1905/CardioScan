import re
from typing import Optional, Set, Tuple

# Common easily-guessable passwords and weak patterns (lowercased)
COMMON_PASSWORDS: Set[str] = {
    "password",
    "password123",
    "password1234",
    "password12345",
    "password123456",
    "123456789012",
    "1234567890123",
    "qwertyuiop12",
    "qwertyuiopas",
    "admin1234567",
    "administrator123",
    "cardioscan123",
    "cardioscan1234",
    "letmein12345",
    "welcome12345",
    "welcome123456",
    "changeme1234",
    "changeme12345",
    "iloveyou1234",
    "iloveyou12345",
    "trustnoone123",
    "sunshine12345",
    "princess12345",
    "dragon123456",
    "football1234",
    "monkey123456",
    "shadow123456",
    "master123456",
    "michael12345",
    "jordan123456",
    "superman1234",
    "batman123456",
}

# Trivial word roots that should not be combined solely with trailing digits/punctuation
TRIVIAL_ROOTS = ("password", "admin", "administrator", "cardioscan", "qwerty", "letmein", "welcome", "changeme")


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Enforce robust password security policy:
    1. Minimum length: 12 characters
    2. Maximum length: 128 characters (prevents Argon2id compute exhaustion DoS)
    3. Blocklist of common/trivial passwords (case-insensitive)
    4. Rejection of low-diversity patterns (fewer than 3 unique characters)
    5. Rejection of trivial roots followed solely by digits or punctuation
    6. Native support for long multi-word passphrases (e.g. 'correct horse battery staple')
    
    Returns (is_valid: bool, error_message: Optional[str])
    """
    if not password:
        return False, "Password is required."

    if len(password) < 12:
        return False, "Password must be at least 12 characters long."

    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."

    lowered = password.lower().strip()

    # 1. Exact match against common blocklist
    if lowered in COMMON_PASSWORDS:
        return False, "Password is too common or easily guessable. Please choose a more secure password."

    # 2. Minimum character diversity (reject repetitive patterns like 'aaaaaaaaaaaa' or '121212121212')
    if len(set(lowered)) < 3:
        return False, "Password is too simple. Please choose a more complex password."

    # 3. Check for trivial roots paired with only digits or symbols
    for root in TRIVIAL_ROOTS:
        if lowered.startswith(root):
            remainder = lowered[len(root):]
            if not remainder or re.fullmatch(r"[\d\W_]+", remainder):
                return False, "Password is too common or easily guessable. Please choose a more secure password."

    return True, None
