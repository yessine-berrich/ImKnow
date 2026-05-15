*** Settings ***
Documentation    TC_AUTH_004 – Forgot-password flow.
...
...              Covers: page load, form submission with valid/invalid email,
...              navigation back to sign-in.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_AUTH_004_01 Forgot-password page loads the email form
    [Documentation]    The forgot-password page must display an email input
    ...                and a submit button.
    [Tags]    smoke    auth    forgot-password
    Go To    ${FORGOT_PWD_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    input[type="email"]    visible    timeout=${TIMEOUT}
    Wait For Elements State    button[type="submit"]  visible    timeout=${TIMEOUT}

TC_AUTH_004_02 Submitting a valid email shows confirmation message
    [Documentation]    After entering a registered email and submitting, the
    ...                page must show a success / "check your inbox" message.
    [Tags]    auth    forgot-password    regression
    Go To    ${FORGOT_PWD_URL}
    Wait For Elements State    input[type="email"]    visible    timeout=${TIMEOUT}
    Fill Text    input[type="email"]    ${VALID_EMAIL}
    Click    button[type="submit"]
    # Expect a success state (redirect or inline message)
    Wait For Elements State    h2    visible    timeout=${RETRY_TIMEOUT}
    ${h2}=    Get Text    h2
    Should Contain    ${h2}    inbox

TC_AUTH_004_03 Submitting an unknown email shows an appropriate message
    [Documentation]    Entering an email that has no account must display a
    ...                meaningful response (no unhandled crash).
    [Tags]    auth    forgot-password    negative
    Go To    ${FORGOT_PWD_URL}
    Wait For Elements State    input[type="email"]    visible    timeout=${TIMEOUT}
    Fill Text    input[type="email"]    nobody@nowhere.com
    Click    button[type="submit"]
    # The page should either show an error or a generic "if this email exists" message
    Wait For Elements State    h2    visible    timeout=${RETRY_TIMEOUT}

TC_AUTH_004_04 Back link returns to sign-in page
    [Documentation]    There must be a link/button to return to the sign-in
    ...                page from the forgot-password page.
    [Tags]    auth    forgot-password    navigation
    Go To    ${FORGOT_PWD_URL}
    Wait For Load State    domcontentloaded
    # Navigate back via link or browser back
    Click    text=Back to Sign In
    Wait For URL    **/signin**    timeout=${RETRY_TIMEOUT}
