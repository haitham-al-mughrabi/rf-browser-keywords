*** Settings ***
Documentation    Common web elements and interactions resource file

*** Variables ***
${LOADING_SPINNER}    css:.spinner
${ERROR_MESSAGE}      css:.error-message
${SUCCESS_MESSAGE}    css:.success-message

*** Keywords ***
Wait For Page To Load
    [Documentation]    Wait for page loading spinner to disappear
    Wait Until Element Is Not Visible    ${LOADING_SPINNER}    timeout=30s

Verify Success Message
    [Documentation]    Verify that success message appears
    [Arguments]    ${expected_message}
    Wait Until Element Is Visible    ${SUCCESS_MESSAGE}    timeout=10s
    Element Text Should Be    ${SUCCESS_MESSAGE}    ${expected_message}

Verify Error Message
    [Documentation]    Verify that error message appears
    [Arguments]    ${expected_message}
    Wait Until Element Is Visible    ${ERROR_MESSAGE}    timeout=10s
    Element Text Should Be    ${ERROR_MESSAGE}    ${expected_message}

Click Element With Retry
    [Documentation]    Click element with retry mechanism
    [Arguments]    ${selector}    ${max_attempts}=3
    FOR    ${attempt}    IN RANGE    1    ${max_attempts + 1}
        ${status}    Run Keyword And Return Status    Click Element    ${selector}
        Exit For Loop If    ${status}
        Sleep    1s
    END
    Should Be True    ${status}    Could not click element after ${max_attempts} attempts

Handle Cookie Banner
    [Documentation]    Handle cookie acceptance banner if present
    ${banner_visible}=    Run Keyword And Return Status    Element Should Be Visible    css:#cookie-banner
    Run Keyword If    ${banner_visible}    Click Element    css:#accept-cookies