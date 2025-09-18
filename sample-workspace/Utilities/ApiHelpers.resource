*** Settings ***
Documentation    API testing helper keywords resource file
Library          RequestsLibrary
Library          Collections

*** Variables ***
${API_BASE_URL}    https://api.example.com
${DEFAULT_HEADERS}    {"Content-Type": "application/json", "Accept": "application/json"}

*** Keywords ***
Setup API Session
    [Documentation]    Create a session for API testing
    [Arguments]    ${session_name}=api    ${base_url}=${API_BASE_URL}
    Create Session    ${session_name}    ${base_url}    headers=${DEFAULT_HEADERS}

Make GET Request
    [Documentation]    Make a GET request and return response
    [Arguments]    ${endpoint}    ${session}=api    ${expected_status}=200
    ${response}=    GET On Session    ${session}    ${endpoint}    expected_status=${expected_status}
    RETURN    ${response}

Make POST Request
    [Documentation]    Make a POST request with JSON data
    [Arguments]    ${endpoint}    ${data}    ${session}=api    ${expected_status}=201
    ${response}=    POST On Session    ${session}    ${endpoint}    json=${data}    expected_status=${expected_status}
    RETURN    ${response}

Make PUT Request
    [Documentation]    Make a PUT request with JSON data
    [Arguments]    ${endpoint}    ${data}    ${session}=api    ${expected_status}=200
    ${response}=    PUT On Session    ${session}    ${endpoint}    json=${data}    expected_status=${expected_status}
    RETURN    ${response}

Make DELETE Request
    [Documentation]    Make a DELETE request
    [Arguments]    ${endpoint}    ${session}=api    ${expected_status}=204
    ${response}=    DELETE On Session    ${session}    ${endpoint}    expected_status=${expected_status}
    RETURN    ${response}

Validate JSON Response
    [Documentation]    Validate JSON response contains expected fields
    [Arguments]    ${response}    @{expected_fields}
    ${json_data}=    Set Variable    ${response.json()}
    FOR    ${field}    IN    @{expected_fields}
        Dictionary Should Contain Key    ${json_data}    ${field}
    END

Extract Value From Response
    [Documentation]    Extract a specific value from JSON response
    [Arguments]    ${response}    ${json_path}
    ${json_data}=    Set Variable    ${response.json()}
    ${value}=    Get Value From Json    ${json_data}    ${json_path}
    RETURN    ${value[0]}

Verify Response Status Code
    [Documentation]    Verify response has expected status code
    [Arguments]    ${response}    ${expected_status}
    Should Be Equal As Integers    ${response.status_code}    ${expected_status}