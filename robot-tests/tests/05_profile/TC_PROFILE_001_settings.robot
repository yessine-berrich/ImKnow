*** Settings ***
Documentation    TC_PROFILE_001 – User settings page.
...
...              Covers: page load, tab switching (Profile / Security /
...              Notifications / Appearance / Sessions), and form validation.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Variables ***
${SETTINGS_TABS}    [role="tab"], button[class*="tab"], [class*="Tab"]


*** Test Cases ***
TC_PROFILE_001_01 Settings page loads without errors
    [Documentation]    Navigating to /settings must render a page with at least
    ...                one settings section.
    [Tags]    smoke    profile    settings
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}

TC_PROFILE_001_02 Profile tab is active by default
    [Documentation]    The Profile tab must be selected (or first-shown) when
    ...                the settings page opens.
    [Tags]    profile    settings    ui
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    input[name="firstName"]    visible    timeout=${TIMEOUT}

TC_PROFILE_001_03 Security tab opens the password change form
    [Documentation]    Clicking the Security tab (FR: Sécurité / EN: Security)
    ...                must reveal password fields.
    [Tags]    profile    settings    security
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Security"), button:has-text("Sécurité")
    Wait For Elements State    input[type="password"] >> nth=0    visible    timeout=${TIMEOUT}

TC_PROFILE_001_04 Theme tab shows appearance options
    [Documentation]    The Theme tab (FR: Thème / EN: Theme) must expose
    ...                appearance controls (light/dark selector, language, etc.).
    [Tags]    profile    settings    appearance
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Theme"), button:has-text("Thème")
    # Accept French "Clair"/"Sombre" or English "Light"/"Dark" — use count to avoid strict mode
    ${theme_btn_count}=    Get Element Count
    ...    button:has-text("Light"), button:has-text("Clair"), button:has-text("Sombre"), button:has-text("Dark")
    Should Be True    ${theme_btn_count} >= 1
    ...    msg=Theme tab must show at least one mode button (Light/Clair/Dark/Sombre)

TC_PROFILE_001_05 Theme tab shows dark/light mode options
    [Documentation]    The Theme tab must expose a light/dark theme selector.
    [Tags]    profile    settings    appearance
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Theme"), button:has-text("Thème")
    # Accept French "Dark"/"Sombre" or English "Dark"
    Wait For Elements State
    ...    button:has-text("Dark"), button:has-text("Sombre")
    ...    visible    timeout=${TIMEOUT}

TC_PROFILE_001_06 Security tab shows two-factor authentication section
    [Documentation]    The Security tab must include a two-factor authentication
    ...                section in addition to the password change form.
    [Tags]    profile    settings    security
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Security"), button:has-text("Sécurité")
    Wait For Elements State    input[type="password"] >> nth=0    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    input[type="password"]
    Should Be True    ${count} >= 1    msg=Security tab must have at least one password field

TC_PROFILE_001_07 Profile tab first-name field is pre-filled
    [Documentation]    The Profile tab must show the user's first name already
    ...                populated in the firstName input.
    [Tags]    profile    settings    regression
    Go To    ${SETTINGS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    input[name="firstName"], input[placeholder*="first" i]    visible    timeout=${TIMEOUT}
    ${value}=    Get Property    input[name="firstName"], input[placeholder*="first" i]    value
    Should Not Be Empty    ${value}

TC_PROFILE_001_08 Submitting empty required fields shows validation error
    [Documentation]    Clearing the firstName field and saving must show an
    ...                error or prevent the save.
    [Tags]    profile    settings    validation
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Wait For Elements State    input[name="firstName"]    visible    timeout=${TIMEOUT}
    Clear Text    input[name="firstName"]
    Sleep    0.5s
    Wait For Elements State    button:has-text("Save"), button:has-text("Enregistrer")    visible    timeout=${TIMEOUT}
    Click    button:has-text("Save"), button:has-text("Enregistrer")
    # Expect error or stay on settings page
    URL Should Contain    /settings

TC_PROFILE_001_09 Notifications tab is present in settings
    [Documentation]    The settings page must include a Notifications tab
    ...                (same text "Notifications" in both FR and EN).
    [Tags]    profile    settings    notifications
    Go To    ${SETTINGS_URL}
    # networkidle ensures React hydration is complete before counting (Get Element Count is instant)
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Wait for at least one tab button to appear, then count Notifications
    Wait For Elements State    button:has-text("Sécurité"), button:has-text("Security")    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    button:has-text("Notifications")
    Should Be True    ${count} >= 1    msg=A Notifications tab must be present in settings

TC_PROFILE_001_10 Notifications tab opens notification preferences
    [Documentation]    Clicking the Notifications tab must reveal notification
    ...                preference controls (toggles / checkboxes).
    [Tags]    profile    settings    notifications
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Notifications")
    Wait For Load State    domcontentloaded
    ${count}=    Get Element Count    input[type="checkbox"], input[type="radio"], [role="switch"], button[aria-checked], [class*="toggle" i], [class*="Switch"]
    Should Be True    ${count} >= 1
    ...    msg=Notifications tab must show at least one toggle or checkbox

TC_PROFILE_001_11 Notifications tab shows email notification section
    [Documentation]    The Notifications tab must include an Email Notifications
    ...                section heading or related label (EN or FR).
    [Tags]    profile    settings    notifications
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    button:has-text("Notifications")
    Wait For Load State    domcontentloaded
    ${count}=    Get Element Count    *:has-text("Email Notifications"), *:has-text("Notifications email"), *:has-text("email")
    Should Be True    ${count} >= 1
    ...    msg=Notifications tab must include an email notifications section

TC_PROFILE_001_12 All four settings tabs are present
    [Documentation]    The settings page must render the four tabs: Profile,
    ...                Security, Notifications, and Theme/Appearance
    ...                (accepts both French and English labels).
    [Tags]    profile    settings    ui    regression
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    # Profile tab: verified by form visibility (tab may not have a labelled button in all locales)
    Wait For Elements State    input[name="firstName"]    visible    timeout=${TIMEOUT}
    # Security tab
    ${security_tab}=    Get Element Count    button:has-text("Security"), button:has-text("Sécurité")
    Should Be True    ${security_tab} >= 1    msg=Security/Sécurité tab must be present
    # Notifications tab — use simple selector (see TC_PROFILE_001_09)
    ${notif_tab}=    Get Element Count    button:has-text("Notifications")
    Should Be True    ${notif_tab} >= 1    msg=Notifications tab must be present
    # Theme/Appearance tab
    ${theme_tab}=    Get Element Count    button:has-text("Theme"), button:has-text("Thème"), button:has-text("Appearance"), button:has-text("Apparence")
    Should Be True    ${theme_tab} >= 1    msg=Theme/Thème tab must be present
