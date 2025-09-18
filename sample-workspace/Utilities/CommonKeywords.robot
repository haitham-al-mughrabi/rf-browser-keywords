*** Settings ***
Documentation    Common utility keywords

*** Keywords ***
Wait For Element And Click
    [Arguments]    ${selector}    ${timeout}=10s
    Wait Until Element Is Visible    ${selector}    ${timeout}
    Click Element    ${selector}

Capture Screenshot With Timestamp
    ${timestamp}=    Get Current Date    result_format=%Y%m%d_%H%M%S
    Take Screenshot    screenshot_${timestamp}.png

Setup Test Environment
    [Arguments]    ${environment}=dev
    Set Suite Variable    ${ENVIRONMENT}    ${environment}
    Log    Setting up test environment: ${environment}

Cleanup Test Environment
    Close All Browsers
    Log    Test environment cleanup completed

Verify Page Title Contains
    [Arguments]    ${expected_text}
    ${title}=    Get Title
    Should Contain    ${title}    ${expected_text}