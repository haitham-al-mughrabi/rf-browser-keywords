*** Settings ***
Documentation    Admin login specific keywords

*** Keywords ***
Admin Login With Credentials
    [Documentation]    Login as admin user
    [Arguments]    ${username}    ${password}
    Go To    ${ADMIN_LOGIN_URL}
    Input Text    id:admin-username    ${username}
    Input Text    id:admin-password    ${password}
    Click Button    id:admin-login-btn
    Wait Until Page Contains    Admin Dashboard

Admin Logout
    [Documentation]    Logout from admin panel
    Click Element    id:admin-menu
    Click Link    Logout
    Wait Until Page Contains    Admin Login

Verify Admin Dashboard Access
    [Documentation]    Verify user has admin dashboard access
    Element Should Be Visible    id:admin-dashboard
    Page Should Contain    Administration

Navigate To User Management
    [Documentation]    Navigate to user management section
    Click Element    id:admin-menu
    Click Link    User Management
    Wait Until Page Contains    User Management

Create New User Account
    [Documentation]    Create a new user account from admin panel
    [Arguments]    ${username}    ${email}    ${role}
    Navigate To User Management
    Click Button    id:create-user-btn
    Input Text    id:new-username    ${username}
    Input Text    id:new-email    ${email}
    Select From List By Label    id:user-role    ${role}
    Click Button    id:save-user-btn
    Wait Until Page Contains    User created successfully