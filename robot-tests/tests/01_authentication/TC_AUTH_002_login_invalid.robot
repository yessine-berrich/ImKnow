*** Settings ***
Documentation    TC_AUTH_002 – Invalid login scenarios.
...
...              Verifies that the sign-in form handles wrong credentials,
...              empty fields, and malformed input gracefully.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_AUTH_002_01 Wrong password shows error message
    [Documentation]    Submitting a valid email with an incorrect password
    ...                must display an error banner and keep the user on /signin.
    [Tags]    auth    negative
    Sign In With Credentials    ${VALID_EMAIL}    ${WRONG_PASSWORD}
    Wait For Elements State    .login-form-box :is(.bg-red-50, .bg-orange-50)    visible    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /signin

TC_AUTH_002_02 Non-existent email shows error message
    [Documentation]    Submitting an email that has no account must display
    ...                an error banner.
    [Tags]    auth    negative
    Sign In With Credentials    ${WRONG_EMAIL}    ${VALID_PASSWORD}
    Wait For Elements State    .login-form-box .bg-red-50    visible    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /signin

TC_AUTH_002_03 Empty email field prevents submission
    [Documentation]    The browser's built-in validation blocks submission
    ...                when the email field is empty.
    [Tags]    auth    validation
    Navigate To Sign In Page
    Fill Text    .login-form-box input[type="password"]   ${VALID_PASSWORD}
    Click    .login-form-box form button
    # The form should NOT navigate away
    URL Should Contain    /signin

TC_AUTH_002_04 Empty password field prevents submission
    [Documentation]    The browser's built-in validation blocks submission
    ...                when the password field is empty.
    [Tags]    auth    validation
    Navigate To Sign In Page
    Fill Text    .login-form-box input[type="email"]    ${VALID_EMAIL}
    Click    .login-form-box form button
    URL Should Contain    /signin

TC_AUTH_002_05 Malformed email is rejected by browser validation
    [Documentation]    Typing a string without "@" into the email field and
    ...                submitting does not navigate away.
    [Tags]    auth    validation
    Navigate To Sign In Page
    Fill Text    .login-form-box input[type="email"]     notanemail
    Fill Text    .login-form-box input[type="password"]  ${VALID_PASSWORD}
    Click    .login-form-box form button
    URL Should Contain    /signin

TC_AUTH_002_06 Password field masks characters by default
    [Documentation]    The password field must use type="password" so the
    ...                characters are masked.
    [Tags]    auth    security    ui
    Navigate To Sign In Page
    ${type}=    Get Attribute    .login-form-box input[type="password"]    type
    Should Be Equal    ${type}    password

TC_AUTH_002_07 Show/hide password toggle switches input type
    [Documentation]    Clicking the eye icon changes the password input type
    ...                from "password" to "text" so the user can read what
    ...                they typed.
    [Tags]    auth    ui
    Navigate To Sign In Page
    ${before}=    Get Attribute    .login-form-box input[type="password"]    type
    Should Be Equal    ${before}    password
    # Click the toggle (span with cursor-pointer next to the password input)
    Click    .login-form-box span.cursor-pointer
    Wait For Elements State    .login-form-box input[type="text"]    visible    timeout=${TIMEOUT}
    ${after}=    Get Attribute    .login-form-box input[type="text"]    type
    Should Be Equal    ${after}    text
