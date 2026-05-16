*** Settings ***
Documentation    TC_ADMIN_000 – Security: admin-only pages must redirect
...              non-admin (EMPLOYEE) users to /error-403.
...
...              All pages tested here require the ADMIN role. A regular
...              EMPLOYEE account must be redirected automatically.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_ADMIN_000_01 /tags redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /tags must be redirected
    ...                to /error-403 automatically.
    [Tags]    smoke    admin    security
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_02 /categories redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /categories must be
    ...                redirected to /error-403 automatically.
    [Tags]    admin    security
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_03 /users redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /users must be redirected
    ...                to /error-403 automatically.
    [Tags]    admin    security
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_04 /rejected/moderation redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /rejected/moderation must
    ...                be redirected to /error-403.
    [Tags]    admin    security
    Go To    ${REJECTED_MOD_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_05 /rejected/duplicated redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /rejected/duplicated must
    ...                be redirected to /error-403.
    [Tags]    admin    security
    Go To    ${REJECTED_DUP_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_06 /reported/reported-articles redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /reported/reported-articles
    ...                must be redirected to /error-403.
    [Tags]    admin    security
    Go To    ${REPORTED_ART_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_07 /reported/reported-users redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /reported/reported-users
    ...                must be redirected to /error-403.
    [Tags]    admin    security
    Go To    ${REPORTED_USR_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_08 /statistics redirects EMPLOYEE to 403
    [Documentation]    A non-admin user visiting /statistics must be
    ...                redirected to /error-403.
    [Tags]    admin    security
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ADMIN_000_09 Error 403 page renders a meaningful message
    [Documentation]    The /error-403 page itself must render without crashing
    ...                and display an access-denied message.
    [Tags]    admin    security    ui
    Go To    ${ERROR_403_URL}
    Wait For Load State    domcontentloaded
    ${count}=    Get Element Count    h1, h2, h3, p
    Should Be True    ${count} >= 1    msg=403 page must display at least one text element
