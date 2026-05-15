*** Settings ***
Documentation    Navigation and sidebar keywords
Library          Browser
Resource         variables.resource


*** Keywords ***
# ═══════════════════════════════════════════════════════════════════════════════
# Generic navigation
# ═══════════════════════════════════════════════════════════════════════════════

Navigate To Home
    Go To    ${HOME_URL}
    Wait For Load State    domcontentloaded

Navigate To Profile
    Go To    ${PROFILE_URL}
    Wait For Load State    domcontentloaded

Navigate To Settings
    Go To    ${SETTINGS_URL}
    Wait For Load State    domcontentloaded

# ═══════════════════════════════════════════════════════════════════════════════
# Search bar
# ═══════════════════════════════════════════════════════════════════════════════

Open Search Bar And Type
    [Documentation]    Focus the global search input and type a query.
    [Arguments]    ${query}
    Click    [placeholder*="Search"]
    Fill Text    [placeholder*="Search"]    ${query}
    Wait For Elements State    [role="listbox"], [data-testid="search-results"], .search-results    visible    timeout=${TIMEOUT}

# ═══════════════════════════════════════════════════════════════════════════════
# Sidebar links
# ═══════════════════════════════════════════════════════════════════════════════

Click Sidebar Link
    [Documentation]    Click a navigation link in the sidebar by its visible text.
    [Arguments]    ${link_text}
    Click    nav >> text=${link_text}
    Wait For Load State    domcontentloaded
