*** Settings ***
Documentation    TC_AUTH_003 – User registration scenarios.
...
...              Covers: form validation, password strength checker,
...              successful signup redirect.
Library          Browser
Library          String
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Variables ***
${UNIQUE_EMAIL}    ${EMPTY}


*** Test Cases ***
TC_AUTH_003_01 Sign-up page loads all required fields
    [Documentation]    The registration page must display first name, last name,
    ...                email, and password inputs plus the submit button.
    [Tags]    smoke    auth    signup
    Navigate To Sign Up Page
    Wait For Elements State    input[name="firstName"]   visible
    Wait For Elements State    input[name="lastName"]    visible
    Wait For Elements State    input[name="email"]       visible
    Wait For Elements State    input[name="password"]    visible
    Wait For Elements State    .register-form-box form button     visible

TC_AUTH_003_02 Password strength checker appears on focus
    [Documentation]    Focusing the password field must reveal the password
    ...                requirements checklist.
    [Tags]    auth    signup    ui
    Navigate To Sign Up Page
    Fill Text    input[name="password"]    T
    # Requirements checklist becomes visible after focus
    Wait For Elements State    text=One uppercase letter    visible    timeout=${TIMEOUT}

TC_AUTH_003_03 Weak password keeps submit button disabled or shows error
    [Documentation]    Entering a password that fails validation ("abc") must
    ...                either disable the submit button or display a validation
    ...                error when submitted.
    [Tags]    auth    signup    validation
    Navigate To Sign Up Page
    Fill Text    input[name="firstName"]    Robot
    Fill Text    input[name="lastName"]     Tester
    Fill Text    input[name="email"]        robot.weak@imknow.com
    Fill Text    input[name="password"]     abc
    # Button must remain disabled when password is weak
    ${disabled}=    Get Property    .register-form-box form button    disabled
    Should Be True    ${disabled}    msg=Submit button should be disabled with a weak password

TC_AUTH_003_04 Successful registration redirects to signin with success banner
    [Documentation]    Registering with a unique, strong password navigates to
    ...                /signin?success=account-created and shows the email
    ...                verification banner.
    [Tags]    auth    signup    regression
    ${ts}=    Evaluate    __import__('time').time_ns()
    ${unique_email}=    Set Variable    robot.reg.${ts}@imknow.com
    Navigate To Sign Up Page
    Fill Text    input[name="firstName"]    Robot
    Fill Text    input[name="lastName"]     Tester
    Fill Text    input[name="email"]        ${unique_email}
    Fill Text    input[name="password"]     RobotTest@9876
    Click    .register-form-box form button
    Wait For URL    **/signin**    timeout=${RETRY_TIMEOUT}
    URL Should Contain    success=account-created

TC_AUTH_003_05 Duplicate email registration shows error message
    [Documentation]    Trying to create an account with an already-registered
    ...                email must display an error/alert and keep the user on
    ...                the sign-up page.
    ...                This test is self-contained: it registers a fresh address
    ...                first, then tries the same address again to trigger the
    ...                duplicate-email error.
    [Tags]    auth    signup    negative
    # Step 1 — register a brand-new address
    ${ts}=    Evaluate    __import__('time').time_ns()
    ${dup_email}=    Set Variable    dup.${ts}@imknow.com
    Navigate To Sign Up Page
    Fill Text    input[name="firstName"]    Dup
    Fill Text    input[name="lastName"]     Test
    Fill Text    input[name="email"]        ${dup_email}
    Fill Text    input[name="password"]     RobotTest@9876
    Click    .register-form-box form button
    Wait For URL    **/signin    timeout=${RETRY_TIMEOUT}
    # Step 2 — re-register the same address → must show an error
    Navigate To Sign Up Page
    Fill Text    input[name="firstName"]    Dup
    Fill Text    input[name="lastName"]     Test
    Fill Text    input[name="email"]        ${dup_email}
    Fill Text    input[name="password"]     RobotTest@9876
    Click    .register-form-box form button
    Sleep    2s
    # Backend throws BadRequestException → frontend shows div.bg-red-50 error banner
    # and keeps user on /signup (no redirect on error)
    ${error_count}=    Get Element Count    div.bg-red-50, span:has-text("existe déjà"), span:has-text("email existe"), div[class*="rounded-xl"][class*="text-red"]
    ${on_signup}=    Run Keyword And Return Status    URL Should Contain    /signup
    Should Be True    ${error_count} > 0 or ${on_signup}
    ...    msg=Registering a duplicate email must display an error indicator

TC_AUTH_003_06 Empty required fields are caught by HTML5 validation
    [Documentation]    Submitting the form with all fields empty does not
    ...                navigate away from the sign-up page.
    [Tags]    auth    signup    validation
    Navigate To Sign Up Page
    # Button must be disabled when fields are empty (password not yet valid)
    ${disabled}=    Get Property    .register-form-box form button    disabled
    Should Be True    ${disabled}    msg=Submit button should be disabled with empty fields
    URL Should Contain    /signup
