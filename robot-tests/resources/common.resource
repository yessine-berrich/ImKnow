*** Settings ***
Documentation    Common setup/teardown keywords and browser initialisation
Library          Browser
Resource         variables.resource


*** Keywords ***
# ═══════════════════════════════════════════════════════════════════════════════
# Suite / Test lifecycle
# ═══════════════════════════════════════════════════════════════════════════════

Open Browser Session
    [Documentation]    Open a fresh browser page with the configured viewport.
    New Browser    ${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': ${VIEWPORT_WIDTH}, 'height': ${VIEWPORT_HEIGHT}}
    New Page       ${BASE_URL}
    Set Browser Timeout    ${TIMEOUT}

Close Browser Session
    [Documentation]    Close all pages and the browser.
    Close Browser

Open Fresh Page
    [Documentation]    Navigate to a URL in the current page (resets state).
    [Arguments]    ${url}
    Go To    ${url}
    Wait For Load State    domcontentloaded

Take Screenshot On Failure
    [Documentation]    Capture a screenshot when a test fails.
    Run Keyword If Test Failed    Take Screenshot    EMBED

# ═══════════════════════════════════════════════════════════════════════════════
# Assertion helpers
# ═══════════════════════════════════════════════════════════════════════════════

Page Should Contain Text
    [Documentation]    Assert a piece of text is visible anywhere on the page.
    [Arguments]    ${text}
    Get Text    body    contains    ${text}

URL Should Be
    [Documentation]    Assert the current URL equals the expected value.
    [Arguments]    ${expected_url}
    ${current}=    Get URL
    Should Be Equal    ${current}    ${expected_url}

URL Should Contain
    [Documentation]    Assert the current URL contains a substring.
    [Arguments]    ${fragment}
    ${current}=    Get URL
    Should Contain    ${current}    ${fragment}

Wait For URL
    [Documentation]    Wait until the current URL contains the given fragment (glob pattern like **/home).
    [Arguments]    ${pattern}    ${timeout}=${RETRY_TIMEOUT}
    ${fragment}=    Evaluate    "${pattern}".replace("**/", "").replace("**", "")
    Wait Until Keyword Succeeds    ${timeout}    0.5s    URL Should Contain    ${fragment}
