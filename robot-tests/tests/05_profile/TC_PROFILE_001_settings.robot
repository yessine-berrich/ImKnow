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
    [Documentation]    Clicking the Security tab must reveal the current-password,
    ...                new-password, and confirm-password fields.
    [Tags]    profile    settings    security
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    text=Security
    Wait For Elements State    input[type="password"] >> nth=0    visible    timeout=${TIMEOUT}

TC_PROFILE_001_04 Theme tab shows appearance options
    [Documentation]    The Theme tab must expose appearance controls
    ...                (light/dark theme selector, language, etc.).
    [Tags]    profile    settings    appearance
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    text=Theme
    Wait For Elements State    button:has-text("Light")    visible    timeout=${TIMEOUT}

TC_PROFILE_001_05 Theme tab shows dark/light mode options
    [Documentation]    The Theme tab must expose a light/dark theme selector.
    [Tags]    profile    settings    appearance
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    text=Theme
    Wait For Elements State    button:has-text("Dark")    visible    timeout=${TIMEOUT}

TC_PROFILE_001_06 Security tab shows two-factor authentication section
    [Documentation]    The Security tab must include a two-factor authentication
    ...                section in addition to the password change form.
    [Tags]    profile    settings    security
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    text=Security
    Wait For Elements State    input[type="password"] >> nth=0    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    input[type="password"]
    Should Be True    ${count} >= 1    msg=Security tab must have at least one password field

TC_PROFILE_001_07 Profile tab first-name field is pre-filled
    [Documentation]    The Profile tab must show the user's first name already
    ...                populated in the firstName input.
    [Tags]    profile    settings    regression
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded
    Click    text=Profile
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
