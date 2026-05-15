# ImKnow – Robot Framework Frontend Tests

## Tech Stack

| Layer | Tool |
|---|---|
| Test Framework | [Robot Framework 7](https://robotframework.org/) |
| Browser Automation | [robotframework-browser](https://robotframework-browser.org/) (Playwright) |
| HTTP Assertions | [robotframework-requests](https://github.com/MarketSquare/robotframework-requests) |

---

## Prerequisites

- Python ≥ 3.9
- Node.js ≥ 18 (for Playwright browsers)
- The **backend** running on `http://localhost:3000`
- The **frontend** running on `http://localhost:3001`

---

## 1 – Install Python dependencies

```bash
cd robot-tests
pip install -r requirements.txt
```

## 2 – Install Playwright browsers

```bash
rfbrowser init
```

This downloads Chromium, Firefox, and WebKit. Only Chromium is used by default.

---

## 3 – Configure test credentials

Edit `resources/variables.resource` and set real values for:

```
${VALID_EMAIL}      your-test-account@imknow.com
${VALID_PASSWORD}   YourTestPassword@123
```

> **Tip:** You can override variables at runtime without editing the file:
> ```bash
> robot --variable VALID_EMAIL:me@test.com --variable VALID_PASSWORD:s3cr3t tests/
> ```

---

## 4 – Start the application stack

```bash
# Terminal 1 – backend (NestJS)
cd backend
npm run start:dev

# Terminal 2 – frontend (Next.js)
cd frontend
npm run dev
```

---

## 5 – Run the tests

```bash
# All tests
cd robot-tests
robot --outputdir results tests/

# Only smoke tests (fast sanity check)
robot --outputdir results --include smoke tests/

# Only authentication tests
robot --outputdir results tests/01_authentication/

# Only one file
robot --outputdir results tests/01_authentication/TC_AUTH_001_login_valid.robot

# Windows convenience wrapper
run_tests.bat
run_tests.bat smoke
run_tests.bat 01_authentication

# Linux / macOS / Git Bash
./run_tests.sh
./run_tests.sh smoke
```

---

## 6 – View results

Open `results/report_<timestamp>.html` in your browser.

---

## Directory structure

```
robot-tests/
├── requirements.txt           # Python deps (RF + Browser library)
├── run_tests.bat              # Windows runner
├── run_tests.sh               # Linux/macOS runner
├── SETUP.md                   # This file
│
├── resources/
│   ├── variables.resource     # Global variables (URLs, credentials)
│   ├── common.resource        # Browser open/close, screenshot on failure
│   ├── auth_keywords.resource # Sign-in / Sign-up / Sign-out keywords
│   └── navigation_keywords.resource  # Navigation & sidebar keywords
│
└── tests/
    ├── 01_authentication/
    │   ├── TC_AUTH_001_login_valid.robot     (5 tests)
    │   ├── TC_AUTH_002_login_invalid.robot   (7 tests)
    │   ├── TC_AUTH_003_signup.robot          (6 tests)
    │   └── TC_AUTH_004_forgot_password.robot (4 tests)
    │
    ├── 02_home/
    │   └── TC_HOME_001_feed.robot            (7 tests)
    │
    ├── 03_search/
    │   └── TC_SEARCH_001_global_search.robot (7 tests)
    │
    ├── 04_articles/
    │   └── TC_ARTICLE_001_article_card.robot (6 tests)
    │
    └── 05_profile/
        └── TC_PROFILE_001_settings.robot     (8 tests)
```

Total: **43 test cases** across 5 functional areas.

---

## Tag taxonomy

| Tag | Meaning |
|---|---|
| `smoke` | Fast sanity checks — run these first |
| `regression` | Full regression suite |
| `auth` | Authentication flows |
| `signup` | Registration tests |
| `forgot-password` | Password reset |
| `home` | Home / article feed |
| `search` | Search bar |
| `article` | Article card interactions |
| `profile` / `settings` | User settings page |
| `negative` | Error / invalid input scenarios |
| `validation` | HTML5 / server-side form validation |
| `security` | Auth-protection checks |
| `ui` | Visual / UX assertions |
| `keyboard` | Keyboard interaction tests |
| `navigation` | Link and routing tests |
| `modal` | Modal dialog tests |
| `interaction` | User interaction (click, type, toggle) |

---

## Headless mode

Set `${HEADLESS}` to `true` for CI pipelines:

```bash
robot --variable HEADLESS:true --outputdir results tests/
```

---

## CI integration (GitHub Actions example)

```yaml
- name: Install Robot Framework
  run: pip install -r robot-tests/requirements.txt

- name: Install Playwright browsers
  run: rfbrowser init

- name: Run Robot Framework tests
  run: robot --variable HEADLESS:true --outputdir robot-tests/results robot-tests/tests/
  
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: robot-results
    path: robot-tests/results/
```
