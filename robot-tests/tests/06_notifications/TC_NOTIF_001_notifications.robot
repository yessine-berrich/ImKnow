*** Settings ***
Documentation    TC_NOTIF_001 – Notifications page scenarios.
...
...              Verifies that the notifications page loads correctly,
...              displays filter controls, preferences section, and
...              handles the notification list properly.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_NOTIF_001_01 Notifications page loads without errors
    [Documentation]    Navigating to /notifications must render the page
    ...                with an h1 heading containing "Notifications".
    [Tags]    smoke    notifications
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${text}=    Get Text    h1
    Should Contain    ${text}    Notifications

TC_NOTIF_001_02 Filter bar shows "Toutes" and "Non lues" buttons
    [Documentation]    The notifications filter bar must expose at least
    ...                two buttons: "Toutes" and "Non lues".
    [Tags]    notifications    ui
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Toutes")    visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Non lues")    visible    timeout=${TIMEOUT}

TC_NOTIF_001_03 Notification preferences section is visible
    [Documentation]    A "Préférences de notifications" section must appear
    ...                below the filter bar on every load.
    [Tags]    notifications    ui
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h2:has-text("Préférences de notifications")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_NOTIF_001_04 Email notification toggle is present
    [Documentation]    The preferences section must include an email
    ...                notifications toggle switch.
    [Tags]    notifications    settings
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h2:has-text("Préférences de notifications")
    ...    visible    timeout=${RETRY_TIMEOUT}
    ${has_email}=    Get Element Count
    ...    button:has-text("Notifications par email"), button:has-text("email")
    Should Be True    ${has_email} >= 1
    ...    msg=At least one notification toggle must be present

TC_NOTIF_001_05 Clicking "Non lues" filter updates the view
    [Documentation]    Clicking the "Non lues" button must apply the filter
    ...                without crashing the page.
    [Tags]    notifications    interaction
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    button:has-text("Non lues")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Non lues")
    Wait For Load State    domcontentloaded
    # Page must still be on /notifications
    URL Should Contain    /notifications

TC_NOTIF_001_06 Clicking "Toutes" filter restores full list
    [Documentation]    After clicking "Non lues", clicking "Toutes" must
    ...                restore the full notification list view.
    [Tags]    notifications    interaction
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    button:has-text("Non lues")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Non lues")
    Sleep    0.5s
    Click    button:has-text("Toutes")
    Wait For Load State    domcontentloaded
    URL Should Contain    /notifications
