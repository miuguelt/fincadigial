import json
from collections import Counter

try:
    with open('frontend/eslint_report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_messages = []
    for file in data:
        for msg in file['messages']:
            all_messages.append(msg['ruleId'])

    summary = Counter(all_messages)
    print("Top ESLint Errors:")
    for rule, count in summary.most_common(20):
        print(f"{rule}: {count}")

    # Find files with most errors
    file_errors = Counter({file['filePath']: len(file['messages']) for file in data})
    print("\nFiles with most errors:")
    for path, count in file_errors.most_common(10):
        print(f"{path}: {count}")

except Exception as e:
    print(f"Error: {e}")
