*** Settings ***
Documentation    Generic login keywords for the application

*** Keywords ***
Login With Valid Credentials
    [Arguments]    ${username}    ${password}
    Open Browser    ${LOGIN_URL}    ${BROWSER}
    Input Text    id:username    ${username}
    Input Text    id:password    ${password}
    Click Button    id:login-btn
    Wait Until Page Contains    Dashboard

Login With Invalid Credentials
    [Arguments]    ${username}    ${password}
    Open Browser    ${LOGIN_URL}    ${BROWSER}
    Input Text    id:username    ${username}
    Input Text    id:password    ${password}
    Click Button    id:login-btn
    Wait Until Page Contains    Invalid credentials

Logout From Application
    Click Button    id:logout-btn
    Wait Until Page Contains    Login

Verify User Is Logged In
    [Arguments]    ${expected_username}
    Element Should Be Visible    id:user-menu
    Element Text Should Be    id:username-display    ${expected_username}

Navigate To User Profile
    Click Element    id:user-menu
    Click Link    Profile