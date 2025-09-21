*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Example Keyword For Testing
    [Arguments]    ${ar1}    ${ar2}    ${ar3}=default_value
    Log    First argument: ${ar1}
    Log    Second argument: ${ar2}  
    Log    Third argument: ${ar3}
    
Another Test Keyword
    [Arguments]    ${url}    ${selector}    ${timeout}=10s
    Open Browser    ${url}    chrome
    Wait Until Element Is Visible    ${selector}    ${timeout}
    
*** Test Cases ***
Test Keyword Customization
    # This is where you would insert customized keywords
    Example Keyword For Testing    value1    value2
    Another Test Keyword    https://example.com    css=.button