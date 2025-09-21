*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Sample Keyword With Arguments
    [Arguments]    ${ar1}    ${ar2}    ${ar3}=default_value
    Log    First argument: ${ar1}
    Log    Second argument: ${ar2}
    Log    Third argument: ${ar3}

Open Browser With Options
    [Arguments]    ${url}    ${browser}=chrome    ${timeout}=10s    ${headless}=False
    Open Browser    ${url}    ${browser}
    Set Browser Implicit Wait    ${timeout}
    Run Keyword If    ${headless}    Set Window Size    1920    1080

Login To Application
    [Arguments]    ${username}    ${password}    ${remember_me}=False
    Input Text    id=username    ${username}
    Input Text    id=password    ${password}
    Run Keyword If    ${remember_me}    Click Element    id=remember
    Click Button    id=login

Verify Element Properties
    [Arguments]    ${selector}    ${text}=${EMPTY}    ${visible}=True    ${enabled}=True
    Run Keyword If    ${visible}    Element Should Be Visible    ${selector}
    Run Keyword If    ${enabled}    Element Should Be Enabled    ${selector}
    Run Keyword If    '${text}' != '${EMPTY}'    Element Should Contain    ${selector}    ${text}

*** Test Cases ***
Test Keyword Customization
    # These are examples of how customized keywords would be used
    Sample Keyword With Arguments    value1    value2    value3
    Open Browser With Options    https://example.com    chrome    30s
    Login To Application    testuser    testpass    True