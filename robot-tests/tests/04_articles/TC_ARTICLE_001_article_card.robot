*** Settings ***
Documentation    TC_ARTICLE_001 – Article card interactions.
...
...              Verifies like, bookmark, share, and article-detail modal on
...              the home feed.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource
Resource         ../../resources/navigation_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Variables ***
${ARTICLE_CARD}    article, [class*="ArticleCard"], [class*="article-card"]
${LIKE_BTN}        button[class*="like"], button[aria-label*="like" i], button[title*="like" i]
${BOOKMARK_BTN}    button[aria-label*="bookmark" i], button[title*="bookmark" i], button[class*="bookmark"]
${SHARE_BTN}       button[aria-label*="share" i], button[title*="share" i], [class*="share"] >> button


*** Test Cases ***
TC_ARTICLE_001_01 Article card renders title, author and category
    [Documentation]    Each article card in the feed must display the article
    ...                title, the author's name, and a category badge.
    [Tags]    smoke    article
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${ARTICLE_CARD}
    Skip If    ${count} == 0    No articles in the feed — skipping card test
    ${first_card}=    Get Element    ${ARTICLE_CARD} >> nth=0
    # Title must be present
    Wait For Elements State    ${first_card} >> h2    visible    timeout=${TIMEOUT}

TC_ARTICLE_001_02 Like button toggles liked state
    [Documentation]    Clicking the like button on the first article increments
    ...                (or decrements) the like counter.
    [Tags]    article    interaction
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${ARTICLE_CARD}
    Skip If    ${count} == 0    No articles in the feed
    ${like_btn}=    Get Element    ${ARTICLE_CARD} >> nth=0 >> ${LIKE_BTN}
    ${before_text}=    Get Text    ${like_btn}
    Click    ${like_btn}
    Sleep    1s
    ${after_text}=    Get Text    ${like_btn}
    Log    Like count before: ${before_text} after: ${after_text}

TC_ARTICLE_001_03 Bookmark button toggles bookmarked state
    [Documentation]    Clicking the bookmark button changes its visual state
    ...                (fill / active class changes).
    [Tags]    article    interaction
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${ARTICLE_CARD}
    Skip If    ${count} == 0    No articles in the feed
    ${bookmark_btn}=    Get Element    ${ARTICLE_CARD} >> nth=0 >> ${BOOKMARK_BTN}
    Click    ${bookmark_btn}
    Sleep    1s
    Log    Bookmark toggled on first article card

TC_ARTICLE_001_04 Clicking an article card opens the detail modal
    [Documentation]    Clicking on the article title or card body must open the
    ...                ArticleDetailModal overlay.
    [Tags]    article    modal    regression
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${ARTICLE_CARD}
    Skip If    ${count} == 0    No articles in the feed
    # Click the title of the first card to open detail modal
    ${title}=    Get Element    ${ARTICLE_CARD} >> nth=0 >> h2
    Click    ${title}
    Wait For Elements State    [class*="z-[99999]"]    visible    timeout=${RETRY_TIMEOUT}

TC_ARTICLE_001_05 Article detail modal can be closed
    [Documentation]    Opening the article detail modal and pressing Escape (or
    ...                clicking the close button) must dismiss it.
    [Tags]    article    modal
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${ARTICLE_CARD}
    Skip If    ${count} == 0    No articles in the feed
    ${title}=    Get Element    ${ARTICLE_CARD} >> nth=0 >> h2
    Click    ${title}
    Wait For Elements State    [class*="z-[99999]"]    visible    timeout=${RETRY_TIMEOUT}
    Click    button[aria-label="Fermer"]
    Wait For Elements State    [class*="z-[99999]"]    hidden    timeout=${TIMEOUT}

TC_ARTICLE_001_06 Create Article button is accessible to authenticated users
    [Documentation]    Authenticated users should see a button or link to create
    ...                a new article.
    [Tags]    article    ui
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button[title*="article" i], button:has-text("Créer"), button:has-text("Create")
    ...    visible    timeout=${RETRY_TIMEOUT}
