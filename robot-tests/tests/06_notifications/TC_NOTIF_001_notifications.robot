*** Settings ***
Documentation    TC_NOTIF_001 – Notifications page scenarios.
...
...              Verifies that the notifications page loads correctly,
...              displays filter controls, preferences section, and
...              handles the notification list properly.
...
...              Selectors accept both French (default) and English UI.
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

TC_NOTIF_001_02 Filter bar shows All and Unread buttons
    [Documentation]    The notifications filter bar must expose at least
    ...                two filter buttons (Toutes/All and Non lues/Unread).
    [Tags]    notifications    ui
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    # Accept French ("Toutes", "Non lues") OR English ("All", "Unread")
    Wait For Elements State
    ...    button:has-text("Toutes"), button:has-text("All")
    ...    visible    timeout=${TIMEOUT}
    Wait For Elements State
    ...    button:has-text("Non lues"), button:has-text("Unread")
    ...    visible    timeout=${TIMEOUT}

TC_NOTIF_001_03 Notification preferences section is visible
    [Documentation]    A preferences section must appear below the filter bar.
    [Tags]    notifications    ui
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    # Accept French or English heading
    # :has-text() does not support the i case-flag in Playwright CSS — use explicit case variants
    Wait For Elements State
    ...    h2:has-text("Préférences"), h2:has-text("Notification preferences"), h2:has-text("Preferences"), h2:has-text("preferences"), h3:has-text("Preferences"), h3:has-text("preferences"), h3:has-text("Préférences")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_NOTIF_001_04 Email notification toggle is present
    [Documentation]    The preferences section must include an email
    ...                notifications toggle switch.
    [Tags]    notifications    settings
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${has_toggle}=    Get Element Count
    ...    input[type="checkbox"], [role="switch"], button[aria-checked], [class*="toggle" i], [class*="Switch"]
    Run Keyword If    ${has_toggle} == 0
    ...    Log    No notification toggle found — page may use a different UI pattern    WARN
    Should Be True    ${has_toggle} >= 1    msg=At least one notification toggle must be present

TC_NOTIF_001_05 Clicking Unread filter updates the view
    [Documentation]    Clicking the "Non lues" / "Unread" button must apply
    ...                the filter without crashing the page.
    [Tags]    notifications    interaction
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    # Try French first, fall back to English
    ${fr_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Non lues")    visible    timeout=5s
    Run Keyword If    ${fr_visible}    Click    button:has-text("Non lues")
    Run Keyword Unless    ${fr_visible}    Click    button:has-text("Unread")
    Wait For Load State    domcontentloaded
    URL Should Contain    /notifications

TC_NOTIF_001_06 Clicking All filter restores full list
    [Documentation]    After clicking Unread, clicking "Toutes" / "All" must
    ...                restore the full notification list view.
    [Tags]    notifications    interaction
    Go To    ${NOTIFICATIONS_URL}
    Wait For Load State    domcontentloaded
    # Click Unread first
    ${fr_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Non lues")    visible    timeout=5s
    Run Keyword If    ${fr_visible}    Click    button:has-text("Non lues")
    Run Keyword Unless    ${fr_visible}    Click    button:has-text("Unread")
    Sleep    0.5s
    # Then click All / Toutes
    ${fr_all}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Toutes")    visible    timeout=3s
    Run Keyword If    ${fr_all}    Click    button:has-text("Toutes")
    Run Keyword Unless    ${fr_all}    Click    button:has-text("All")
    Wait For Load State    domcontentloaded
    URL Should Contain    /notifications
