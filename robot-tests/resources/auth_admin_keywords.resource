*** Settings ***
Documentation    Admin authentication keyword — signs in with ADMIN credentials.
...
...              ⚠ Requires a valid ADMIN account defined in variables.resource:
...                  ${ADMIN_EMAIL}    and    ${ADMIN_PASSWORD}
Library          Browser
Resource         variables.resource
Resource         auth_keywords.resource


*** Keywords ***
Sign In As Admin
    [Documentation]    Sign in with the configured ADMIN credentials and wait
    ...                for redirection to the home page.
    Sign In With Credentials    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Wait For URL    **/home    timeout=${RETRY_TIMEOUT}
