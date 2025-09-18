*** Settings ***
Documentation    Test data management and generation resource file

*** Variables ***
${TEST_DATA_DIR}    ${EXECDIR}/test-data

*** Keywords ***
Generate Test User Data
    [Documentation]    Generate random test user data
    ${timestamp}=    Get Current Date    result_format=%Y%m%d%H%M%S
    ${random_number}=    Evaluate    random.randint(1000, 9999)    random
    &{user_data}=    Create Dictionary
    ...    username=testuser_${timestamp}_${random_number}
    ...    email=test_${timestamp}@example.com
    ...    first_name=Test
    ...    last_name=User${random_number}
    ...    password=TestPass123!
    RETURN    &{user_data}

Load Test Data From File
    [Documentation]    Load test data from JSON file
    [Arguments]    ${filename}
    ${file_path}=    Join Path    ${TEST_DATA_DIR}    ${filename}
    ${data}=    Get File    ${file_path}
    ${json_data}=    Evaluate    json.loads('''${data}''')    json
    RETURN    ${json_data}

Save Test Data To File
    [Documentation]    Save test data to JSON file
    [Arguments]    ${data}    ${filename}
    ${file_path}=    Join Path    ${TEST_DATA_DIR}    ${filename}
    ${json_string}=    Evaluate    json.dumps(${data}, indent=2)    json
    Create File    ${file_path}    ${json_string}

Generate Random String With Pattern
    [Documentation]    Generate random string following specific pattern
    [Arguments]    ${pattern}=AAANNN    ${length}=6
    # A = letter, N = number, S = symbol
    ${result}=    Set Variable    ${EMPTY}
    FOR    ${i}    IN RANGE    ${length}
        ${char_type}=    Set Variable If    '${pattern[${i}]}' == 'A'    letter
        ...                               '${pattern[${i}]}' == 'N'    number
        ...                               '${pattern[${i}]}' == 'S'    symbol
        ...                               letter
        ${char}=    Run Keyword    Generate Random ${char_type}
        ${result}=    Set Variable    ${result}${char}
    END
    RETURN    ${result}

Generate Random Letter
    [Documentation]    Generate a random letter
    ${letters}=    Set Variable    ABCDEFGHIJKLMNOPQRSTUVWXYZ
    ${index}=    Evaluate    random.randint(0, 25)    random
    RETURN    ${letters[${index}]}

Generate Random Number
    [Documentation]    Generate a random digit
    ${number}=    Evaluate    random.randint(0, 9)    random
    RETURN    ${number}

Generate Random Symbol
    [Documentation]    Generate a random symbol
    ${symbols}=    Set Variable    !@#$%^&*
    ${index}=    Evaluate    random.randint(0, 7)    random
    RETURN    ${symbols[${index}]}

Create Unique Test ID
    [Documentation]    Create a unique identifier for test runs
    ${timestamp}=    Get Current Date    result_format=%Y%m%d_%H%M%S
    ${random}=    Evaluate    random.randint(100, 999)    random
    ${test_id}=    Set Variable    TEST_${timestamp}_${random}
    RETURN    ${test_id}