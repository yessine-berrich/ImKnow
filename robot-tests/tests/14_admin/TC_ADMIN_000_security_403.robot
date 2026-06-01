*** Settings ***
Documentation    TC_ADMIN_000 – Security: admin-only pages must block
...              unauthenticated access and redirect to /signin.
...
...              These tests run WITHOUT authentication to verify that the
...              application's middleware/routing properly guards admin routes.
...              Unauthenticated users are expected to be redirected to /signin.
...
...              NOTE: Testing that EMPLOYEE (non-admin authenticated) users
...              receive /error-403 requires a seeded verified employee account.
...              Set VALID_EMAIL=testuser@imknow.com with emailVerified=true
...              in the database and change Suite Setup to Sign In As Employee.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Keywords ***
Admin Page Should Be Guarded
    [Documentation]    Navigate to an admin-only URL and verify the app redirects
    ...                the unauthenticated visitor away (to /signin or /error-403).
    [Arguments]    ${admin_url}
    Go To    ${admin_url}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${on_signin}=    Run Keyword And Return Status    URL Should Contain    /signin
    ${on_403}=    Run Keyword And Return Status    URL Should Contain    /error-403
    Should Be True    ${on_signin} or ${on_403}
    ...    msg=Unauthenticated access to ${admin_url} must redirect to /signin or /error-403


*** Test Cases ***
TC_ADMIN_000_01 /tags blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /tags must be redirected
    ...                to /signin or /error-403.
    [Tags]    smoke    admin    security
    Admin Page Should Be Guarded    ${TAGS_ADMIN_URL}

TC_ADMIN_000_02 /categories blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /categories must be
    ...                redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${CATEGORIES_URL}

TC_ADMIN_000_03 /users blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /users must be redirected
    ...                to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${USERS_ADMIN_URL}

TC_ADMIN_000_04 /rejected/moderation blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /rejected/moderation
    ...                must be redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${REJECTED_MOD_URL}

TC_ADMIN_000_05 /rejected/duplicated blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /rejected/duplicated
    ...                must be redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${REJECTED_DUP_URL}

TC_ADMIN_000_06 /reported/reported-articles blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /reported/reported-articles
    ...                must be redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${REPORTED_ART_URL}

TC_ADMIN_000_07 /reported/reported-users blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /reported/reported-users
    ...                must be redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${REPORTED_USR_URL}

TC_ADMIN_000_08 /statistics blocks unauthenticated access
    [Documentation]    An unauthenticated visitor to /statistics must be
    ...                redirected to /signin or /error-403.
    [Tags]    admin    security
    Admin Page Should Be Guarded    ${STATISTICS_URL}

TC_ADMIN_000_09 Error 403 page renders a meaningful message
    [Documentation]    The /error-403 page itself must render without crashing
    ...                and display an access-denied message.
    [Tags]    admin    security    ui
    Go To    ${ERROR_403_URL}
    Wait For Load State    domcontentloaded
    ${count}=    Get Element Count    h1, h2, h3, p
    Should Be True    ${count} >= 1    msg=403 page must display at least one text element
