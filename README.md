# Project Nocturno

**Project Nocturno is a Tauri-based desktop launcher interface focused on managing local Fortnite: Save the World builds, selecting older game versions, connecting to Nocturno services, and presenting social and launcher status information.**

The repository contains the frontend files used by the Nocturno desktop experience: HTML entry pages, JavaScript modules, CSS stylesheets, font assets, and a language dictionary. The checked-in UI includes a main launcher screen, a login screen, a social/friends window, a version manager, settings, a launch workflow, branch-based file preparation, a WebSocket client, and Discord Rich Presence formatting.

The interface calls native Tauri commands for filesystem access, environment variables, authentication, network requests, process launching, version scanning, file hashing, and updates. **The native Tauri application/backend source and build configuration are not present in the current repository tree**, so this checkout by itself is not a complete, independently buildable desktop application. The documentation below distinguishes what is visible in the checked-in frontend from what depends on the separate native host or remote services.

The English language dictionary describes Nocturno as a project intended to bring back and expand functionality for older Fortnite versions, with an emphasis on the original Save the World game mode. It also states that Nocturno is not affiliated with Epic Games. This is a community project description, not a statement of endorsement by the game publisher.

> **Scope note:** this README documents the behavior visible in the current repository. It does not certify the safety of distributed binaries, guarantee service availability, or claim that every UI control has a completed backend implementation.

---

## Contents

- [Overview](#overview)
- [Project purpose and design](#project-purpose-and-design)
- [Feature summary](#feature-summary)
- [What is actually included in this repository](#what-is-actually-included-in-this-repository)
- [Architecture](#architecture)
- [Application lifecycle](#application-lifecycle)
- [Main launcher interface](#main-launcher-interface)
- [Authentication and local account data](#authentication-and-local-account-data)
- [Version manager and local build import](#version-manager-and-local-build-import)
- [Branches and file preparation](#branches-and-file-preparation)
- [Launching a selected version](#launching-a-selected-version)
- [Game-server workflow](#game-server-workflow)
- [Offline mode](#offline-mode)
- [Social window and friend presence](#social-window-and-friend-presence)
- [WebSocket communication](#websocket-communication)
- [Discord Rich Presence](#discord-rich-presence)
- [Settings and configuration](#settings-and-configuration)
- [Localization](#localization)
- [Updater integration](#updater-integration)
- [Remote dependencies and network services](#remote-dependencies-and-network-services)
- [Repository structure](#repository-structure)
- [File-by-file reference](#file-by-file-reference)
- [Technology and dependencies visible in the frontend](#technology-and-dependencies-visible-in-the-frontend)
- [Installation and development limitations](#installation-and-development-limitations)
- [Troubleshooting](#troubleshooting)
- [Security and privacy review](#security-and-privacy-review)
- [Known limitations and incomplete features](#known-limitations-and-incomplete-features)
- [Recommended development roadmap](#recommended-development-roadmap)
- [Testing checklist](#testing-checklist)
- [Contributing](#contributing)
- [Bug reports](#bug-reports)
- [Frequently asked questions](#frequently-asked-questions)
- [Credits and project boundaries](#credits-and-project-boundaries)

---

## Overview

Nocturno is presented as a desktop launcher rather than a conventional website. Its markup uses Tauri window attributes and its JavaScript depends on the Tauri global API for native capabilities. Those capabilities allow the frontend to ask the desktop host to read and write files, retrieve environment variables, communicate with backend services, open paths, select directories, update the app, and launch the game process.

The current frontend is split into three visible windows/pages:

- **Main launcher:** user status, home screen/news, launch button, local version manager, settings, language selector, hide-launcher preference, offline-mode entry point, and links to social features.
- **Login page:** a short numeric access-code form that submits the code through a native command, expects an access token in the response, and writes account data to the user's Nocturno directory.
- **Social window:** friend groups, online/offline/playing presence, user-status updates, and a custom context menu.

The UI has visual styles for installing, busy, running, ready, and waiting states. It supports importing a local game build, detecting its executable and build identity through native commands, saving a named version, assigning a branch, and passing optional runtime arguments to the launch request.

### At a glance

| Property | Current evidence |
| --- | --- |
| Project name | Project Nocturno |
| Primary language of UI copy | English |
| Runtime framework expected by frontend | Tauri |
| UI technology | HTML, CSS, JavaScript ES modules |
| Main page | index.html |
| Authentication page | login.html |
| Social page | social.html |
| Shared state/config code | module/main.js and module/constants.js |
| Version import and launch orchestration | module/version.js |
| Friend list and presence | module/social.js |
| Live service connection | module/websocket.js |
| Discord activity formatting | module/discord_rpc.js |
| Translation dictionary | _lang.json |
| Package manifest in this checkout | Not present |
| Native Tauri source in this checkout | Not present |
| Standalone build reproducibility | Cannot be established from the checked-in files alone |

## Project purpose and design

The interface appears designed to manage existing local Fortnite installations and prepare the selected build for a Nocturno service branch. A user can import a directory containing the expected game executable, identify a known version where possible, save metadata for that installation, choose it later, and request launch.

The project also supports a service-connected experience: account login, user presence, friend-list updates, online status, launcher news, branch metadata, client-side version preparation, and optional Discord Rich Presence. Some actions require an authenticated session; some local UI operations can work using cached data if the app's offline mode is activated.

The current code does not implement downloading complete Fortnite versions through the launcher UI. The main page explicitly displays a notice that version downloading is disabled and that users must obtain their own game files. In contrast, the version preparation logic can request branch files from the Nocturno backend while preparing a selected local build. These are different operations and should not be confused.

The frontend calls native functionality through Tauri commands. A JavaScript call such as an invoke to scan a build is only the interface side of the operation; its actual implementation lives in the host application. As the native host is absent from this repository, the exact Rust command implementation, permissions, network validation, and executable process behavior cannot be audited from these frontend files alone.

## Feature summary

| Feature | Visible implementation | Status from this repository |
| --- | --- | --- |
| Launcher UI | Main HTML/CSS and JavaScript modules | Present |
| Login UI | Numeric access-code form | Present; end-to-end authentication depends on Tauri/native backend and service |
| Store account data | Writes returned JSON to the app data directory | Present in frontend |
| Local version import | Directory picker, binary discovery, version scan | Frontend integration present; native commands required |
| Version editor | Name, identifier, path, branch, arguments | Present |
| Version delete | Confirmation and removal from configuration | Present |
| Complete game-version download button | Shows explicit message that downloading versions is disabled | Disabled intentionally in this frontend |
| Branch file preparation | Fetches branch metadata and requests missing/mismatched files | Present in frontend; depends on service and native file commands |
| Hash comparison | Requests SHA-1 for local files | Frontend integration present; hash calculation is native |
| Game launch | Emits a Tauri event with path, exchange code, DLL metadata, and arguments | Request is present; native launcher implementation is absent here |
| Game-server mode | Asks for a DLL and requests server launch data | Frontend flow present; depends on missing host/backend |
| Offline mode | Reads cached branch JSON metadata | Present but requires valid local cache files |
| News/blog feed | Requests service data and renders cards | Present; dependent on remote API |
| Friend list | Renders accepted, incoming, outgoing, and blocked entries | Present |
| Friend actions | Context menu shows action names | **Action handler is empty in this revision** |
| Live presence | WebSocket pushes status updates into frontend events | Present; depends on network and authentication |
| Discord Rich Presence | Transforms game/session fields into activity data | Present; requires native RPC handler and matching service payloads |
| Language switching | Translation dictionary and language selector | Present for English, Spanish, and Japanese |
| Auto-update | Calls Tauri updater check/download/install | Integration present; requires packaged updater configuration |
| Sentry | Loads Sentry's hosted browser script and initializes it | Present; exact event payload and retention depend on configuration |
| External hotfix script | Loaded from nocturno.cc by all three HTML pages | Present; behavior is remote and not versioned in this repository |

This table is intentionally conservative. A visible button or frontend event does not prove the full operation succeeds in a packaged desktop app.

## What is actually included in this repository

The current tree contains 38 entries, including these categories:

- Three HTML screens.
- JavaScript modules for launcher state, version management, social features, WebSocket messages, Discord RPC, settings, localization, and common window behavior.
- CSS files for the main launcher, login, social window, and fonts.
- Font assets for the BrutalType and GenEi Gothic Pro families.
- A bundled TweenMax animation library.
- A JSON dictionary with English, Spanish, and Japanese UI copy.
- A short README.

The tree does not include a visible package.json, Cargo.toml, Tauri configuration directory, Rust source directory, native command handlers, or an explicit build pipeline. That absence is important for installation and security review. The frontend references many native commands whose handlers must exist in the external Tauri host for the app to operate.

A person cloning this repository should treat it as a frontend/source snapshot, not as a guaranteed complete launcher distribution.

## Architecture

The application has three conceptual layers.

### 1. HTML/CSS presentation layer

The HTML files define window structure and UI controls. The CSS files control appearance, sizing, overlays, buttons, friend lists, typography, and animations. The visible UI references image assets by paths under an img directory, but that directory is not present in the current recursive tree. Those assets may be supplied by another distribution/package or may be missing from this repository snapshot; packaging should verify the real assets before release.

### 2. JavaScript application layer

The JavaScript modules manage page behavior and coordinate actions. The main module stores launcher state and user status. The version module handles version metadata and launch preparation. The social module renders presence information. The WebSocket module receives service messages and emits local Tauri events. The Discord module converts session data into activity information.

These modules use a mixture of DOM events, Tauri events, and invoke requests. This means debugging often requires tracing a feature through more than one API boundary.

### 3. Tauri host and remote services

The frontend depends on native Tauri capabilities such as filesystem operations, system environment access, dialogs, window management, update installation, process launching, hashing, HTTP requests, and access-token handling. It also contacts Nocturno service endpoints for account, branch metadata, file retrieval, blog posts, and live client communications.

The native layer is not included in this repository snapshot. Therefore this documentation can identify command names and expected payloads, but cannot verify how the backend validates paths, protects credentials, launches processes, or checks remote responses.

### Data flow overview

A typical service-connected session follows this pattern:

1. The application initializes local configuration and requests the current authentication state.
2. If the session is valid, the UI displays the user and loads service-backed information.
3. The WebSocket connection obtains the app version and auth data from the native layer.
4. Once connected, the frontend sends an authentication message containing the access token.
5. Service messages are cached in memory and re-emitted as local Tauri events.
6. The launcher and social view respond to those events by updating status, friend lists, or Discord activity.
7. When the user launches a selected build, the frontend prepares required branch files and requests an exchange code.
8. The frontend emits a launch request to the Tauri host, which must perform the native process work.

The exact host behavior at steps involving native APIs cannot be proven from this repository alone.

## Application lifecycle

The main module obtains the user's APPDATA path through a Tauri invoke command and builds a Nocturno-specific application directory beneath it. It initializes default configuration, fetches blog data, registers UI handlers, checks for updates, ensures the configuration directory exists, loads saved configuration, restores language and window dimensions, restores the selected version, and requests the current authentication state.

If the app has not populated the user state after a short delay, the UI changes its loading indicator to an error state and offers retry/offline controls. This is a user-facing timeout, not proof that the remote backend has stopped; a slow connection could still be in progress.

### Launch button states

The constants module defines several button states:

- **READY:** launch is available, and the selected version may be shown.
- **INSTALLING:** the interface can show an installing state and hide the settings button.
- **PLEASE_WAIT:** disables the button and hides settings.
- **BUSY:** indicates work is active and blocks repeated presses.
- **RUNNING:** indicates that a launch request has been issued and the button is disabled.

These labels are UI state definitions. The current frontend does not, on its own, prove the game executable started or reached a playable state. The native host should emit accurate lifecycle events, and the renderer should return to READY on a confirmed close event.

## Main launcher interface

The main page contains a top toolbar, user menu, launcher controls, game button, version manager overlay, settings overlay, and blog/news cards. The launcher also exposes buttons for opening the social window and user data directory, and a preference for hiding the launcher when the game starts.

The blog feed requests data from the backend using a secure-fetch command. If the returned data is empty, invalid, or raises an error, the frontend removes the blog container rather than stopping the entire main view. This is a sensible form of optional-feature isolation: a news outage should not necessarily prevent the user from seeing locally registered versions.

### Window behavior

The interface uses Tauri window controls and listens for resize changes. It saves the window dimensions in the application config and restores the configured size and centered position during startup. In the common script, the maximize button state is updated by checking the active window.

The common script also blocks right-click context menus and several common Ctrl-key shortcuts. This is a UI restriction, not a security boundary; privileged operations must still be protected by Tauri permissions and native-side validation.

### External links

Blog cards and the account-management link can open URLs through Tauri's shell functionality. The native handler should constrain external URL schemes to those that are intentional for the application, and service-provided link values should be treated as untrusted data.

## Authentication and local account data

The login page asks for a numeric access code. The frontend expects exactly nine characters and blocks most non-numeric input. When the form is submitted, it invokes the native command named submit_code and expects a JSON response.

The frontend checks whether the response can be parsed, whether it contains an error code, and whether it contains an access_token. When these checks pass, it writes the returned JSON into a local user file beneath the Nocturno app-data folder, then navigates to the main page.

### Authentication flow, as visible in the UI

1. The user obtains a launcher access code through the service-linked flow.
2. The user enters the code into the login page.
3. The frontend invokes submit_code in the Tauri host.
4. The host/service returns a response that should contain an access token when authentication succeeds.
5. The frontend writes the returned JSON to the local user file.
6. The main window requests or receives auth state and either displays the user's account or returns to the login page.

The host-side exchange and storage permissions are not present here, so the server protocol and token lifecycle cannot be verified from this repository alone.

### Local account file

The frontend writes account JSON beneath the Nocturno directory under APPDATA, in a file named user.json. That data can contain an access token and should be treated as a credential, not as harmless preference data. Do not post it in public issues, upload it to a file-sharing service, or commit it to source control.

A production implementation should use the least-privilege storage supported by the host platform, set appropriate file permissions, avoid logging full authentication objects, and provide a clear sign-out path that actually invalidates or removes local auth data.

### Sign-out

The main UI calls a native delete_auth command and redirects the user to the login page. The actual meaning of “delete auth” depends on the missing native host implementation: it could delete local session data, revoke a server-side session, or do some subset of those actions. The frontend alone does not prove that a token is revoked remotely.

## Version manager and local build import

The version manager is a key part of the frontend. It provides a list of saved versions, a version editor, and an import flow for an existing local game directory.

A version entry includes fields such as a UUID, display name, version identifier, path to the shipping executable, branch name, and optional runtime arguments. A saved version may also include a cover identifier used by the UI.

### Import workflow

When the user imports a version, the frontend opens a directory picker. It asks the native layer to locate the Fortnite executable within the selected directory. The import is rejected if no expected binary is found or if multiple candidate binaries are returned. If exactly one binary is detected, the frontend asks the host to scan its version/build identity.

The resulting build string is compared with a hard-coded list of known version signatures. When a known entry matches, the UI can prefill a version identifier, branch, and cover; otherwise the version is represented as unknown. The user then edits and saves the local record.

The actual executable discovery and version scan happen through native Tauri commands named walk_fortnite_binary and scan_fortnite_version. Their implementation is outside the current repository, so exact path rules and supported executable layouts remain unverified.

### Version editing

The editor lets the user change the version name, ID, path, branch, and launch arguments. When saved, the version is inserted into or replaces the corresponding entry in the local config. If it was selected, the selected-version label is refreshed.

The delete flow asks for confirmation before removing the selected version from the local configuration. The operation is not a full uninstall of the game directory; it removes the saved launcher entry.

### Selected version restoration

On startup, the launcher uses the saved selectedVersion UUID to locate a matching entry in config. If the UUID no longer exists, the selection is cleared. This avoids showing an identifier for a version that is no longer present in the config list, though it does not verify that the underlying game files are still present or valid until launch preparation.

## Branches and file preparation

The version module maintains a list of known version/build mappings and associates a branch with each recognized version. During launch preparation, the frontend calls initBranch for the selected branch and local executable path.

In online mode, it requests branch metadata from the Nocturno API. In offline mode, it reads cached JSON branch metadata from the application's local DLL/cache directory. The response is expected to contain a file list and may include PAK rename instructions.

### Local file checks

Each branch item includes a name and a hash-like reference. For each item, the frontend determines whether it is a PAK file. PAK files are expected in the selected game's Content/Paks directory, while other files are saved under the branch-specific folder beneath Nocturno's local data directory.

The frontend asks the native host to calculate a local SHA-1 value for an existing file, then compares it with the reference value. When the file is absent or the values differ, it calls a native download_url command with a relative backend path and the destination path.

The branch preparation response is cached as a JSON file for offline use. It returns metadata for non-PAK files, including filename, reference hash, optional injection location, disabled flag, and destination path. These fields are part of the frontend-to-host contract; the actual handling of the injection-related metadata belongs to the native host, which is not present in this repository.

### PAK rename behavior

If branch metadata contains rename instructions, the frontend scans the PAK directory and renames files matching the old names to their specified new names. This is a mutating operation on the user's local game directory. The native filesystem implementation and the remote manifest source should be trusted, and any future implementation should validate that rename targets remain inside the intended PAK directory.

The code performs these changes during branch preparation. A failed or interrupted preparation could leave part of the directory updated, so a reliable host should use safe path validation and clear error reporting. Users should keep a backup of any local build they do not want altered.

### Important distinction: version downloads are disabled

The main launcher explicitly tells users that full version downloads are disabled and that the user must source their own game files. That statement does not contradict the branch preparation code: branch preparation can fetch ancillary files listed by a service for an already imported local build. It should not be described as a general game-version downloader.

## Launching a selected version

The startGame function first marks the launch button as busy. It verifies that a version is selected and that the configured executable path still exists. It then reads the version's branch and prepares the files for that branch.

If the branch preparation returns file metadata, the frontend requests an exchange code through the secure-fetch command. If the response reports an error, launch is stopped. When the configuration says to hide the launcher, the frontend emits a hide event. The user can optionally supply an override exchange-code value in the interface; otherwise the service-returned value is used.

Finally, the UI changes the button to RUNNING and emits a launch-fortnite event containing the selected binary path, exchange code, serialized file metadata, and optional runtime arguments.

### What this frontend does not prove

The frontend emits the launch request; it does not itself include the Rust/native process-spawning implementation. Therefore this repository alone cannot confirm the actual child-process configuration, privilege level, injection implementation, error handling, or the point at which the game is considered fully started. Those details must be reviewed in the corresponding Tauri host source.

### Runtime arguments and launch metadata

Runtime arguments are saved as part of the version entry and forwarded in the launch event. The host should handle them as structured arguments where possible rather than blindly concatenating untrusted values into a shell command. Paths and launch metadata received from the UI should also be revalidated by the host rather than trusted because they came from the version editor.

The frontend logs selected version and exchange-code information during launch preparation. Since exchange codes are sensitive, logs should not retain their raw values. Only non-sensitive status and correlation information should be recorded.

## Game-server workflow

The UI includes a game-server start function. It asks the user to select a DLL file, validates that a version is selected and that its binary exists, prepares the selected branch, and then keeps only the redirect DLL metadata from the prepared branch list. It adds an entry describing the user-selected gameserver DLL, reads server launch data through a native command, and builds launch arguments including a configured port and optional runtime arguments.

It emits the same general launch-fortnite event with additional metadata indicating a game-server launch. The code expects configuration supplied through a window.GAMESERVER object, including values such as injection location, delay, and extra arguments.

This flow depends heavily on the native host and external service configuration. The current repository does not contain the implementation that starts the process or validates server data. Treat the flow as frontend orchestration only, and use only files and server environments you are authorized to operate.

## Offline mode

The main module exposes an offlineMode entry point. It sets a local offline flag, reads cached branch JSON files under the Nocturno directory, obtains branch names from those files, and updates the visible user state to an Offline profile. That allows the UI to present local cached branch options when a live account connection is unavailable.

Offline mode has clear boundaries:

- It depends on cached branch JSON already being present.
- It does not prove that every referenced DLL or PAK is present or valid.
- It cannot create new remote exchange codes or authenticate a live account by itself.
- It may not support workflows that require a server response.
- Its ability to launch depends on what the native host permits and what local files are available.

If offline mode fails, check whether the Nocturno directory exists and whether the cached JSON files are readable and well-formed. Do not infer that a local cache is trustworthy merely because it was loaded successfully.

## Social window and friend presence

The social window shows friend groupings for accepted friends, incoming requests, outgoing requests, and cached blocked entries. Accepted friends are split into online and offline sections. Friends whose session type indicates that they are in game are prioritized in the list; their session payload may supply a human-readable status. Other friends may appear as online, offline, or in the launcher.

The social module listens for two local Tauri events: social initialization and social presence updates. It can request the last cached initialization message when the view is opened. Status controls emit a set_status event, which the WebSocket module forwards to the service when connected.

### Friend context menu

Clicking a friend opens a context menu whose visible options vary by relationship type. Accepted friends can be shown options for remove/block; outgoing requests can show cancel/block/mute; incoming requests can show accept/block.

However, the current handleClick function only reads the selected action and returns without performing the operation. The context menu is therefore a visual shell in this revision, not a fully implemented friend-management interface. It should not be documented as successfully accepting, blocking, muting, cancelling, or removing friends until the missing action handling is implemented and tested.

### Rendering and trust boundary

Friend entries are built from fields supplied by service messages, including username, account identifier, and session status. The frontend uses HTML string construction for list entries and context menus. Values sourced from remote messages should be escaped or inserted through safe DOM text APIs. A production implementation should not trust a service payload to be safe HTML.

## WebSocket communication

The frontend creates a WebSocket connection to a Nocturno service endpoint whose path identifies the launcher client API and includes the current launcher version as a query parameter. Before opening the connection, it asks the Tauri host for the current version and stored authentication data.

When the socket opens, the code sends a JSON message with type auth and the access token taken from the stored auth response. Incoming WebSocket messages are parsed as JSON, keyed by their type, cached in memory, and forwarded as local Tauri events named with the ws prefix.

The module also supports requesting the last received message of a given type. This lets a UI module initialize from cached in-memory state rather than waiting for the server to resend the message.

### Reconnection behavior

When the socket closes, the frontend logs that it will retry after five seconds and calls initWebsocket again. It logs socket errors as well. A robust production version should prevent multiple concurrent reconnect timers, use bounded backoff for repeated failure, handle malformed JSON without breaking the message handler, and provide a visible connection state.

### Authentication and debug logging

The WebSocket authentication message contains an access token. The module also has a debug flag enabled in the current code and logs complete incoming message objects. Depending on service payloads, these objects could contain personal account or friend metadata. Logs should be reviewed and redacted before release, issue submission, or remote telemetry forwarding.

The access token should never be written to debug logs. The frontend should not use local console logs as the only way to diagnose connection/authentication failure.

## Discord Rich Presence

The Discord module listens for a WebSocket event containing RPC data. It reads session status, whether a user is playing, joinability, custom data, and a timestamp. It extracts Fortnite Save the World information from the FortBasicInfo custom field and maps selected locations/activities to a matching large-image identifier, such as Stonewood, Plankerton, Canny Valley, Twine Peaks, or Battle Royale.

The resulting presence payload includes a state such as In Game or In Menus, details derived from the status string, a launcher small-image identifier, Nocturno as the small-image label, and a timestamp. It then sends that payload to a native custom_rpc command.

This file formats activity data; actual Discord RPC connectivity and application configuration belong to the Tauri host. The formatter also expects the FortBasicInfo entry to exist in customData. If the service sends an incomplete payload, that assumption can throw. A more defensive implementation should validate fields and handle missing custom data cleanly.

Presence is an optional integration and should fail independently from local version management and launching.

## Settings and configuration

The default configuration in module/constants.js includes:

| Setting | Default / meaning |
| --- | --- |
| Window width | 1200 |
| Window height | 700 |
| Selected version | None |
| Hide launcher | Disabled |
| Language | English |
| Saved versions | Empty list |

The main module stores config beneath the Nocturno app-data directory in a config JSON file. It restores the saved dimensions, centers the window, selects the saved version when possible, and resets to default configuration if loading/parsing fails or an old configuration shape is detected.

The settings screen includes language selection, a hide-launcher preference, access to the Nocturno directory, and a server/game-server entry point. Window resize events update the saved dimensions within the configured upper limits.

### Configuration compatibility

Because the config stores version objects and settings together, changing the schema can break older local files. Future schema changes should include a version number and migration logic. Configuration writes should be atomic where the native host supports it, and failed writes should be shown to the user rather than only logged.

The current code logs the loaded configuration. Before sharing logs, check for personal file paths or any future fields that could contain secrets.

## Localization

The localization system reads _lang.json and registers a custom HTML element named localized-text. UI elements refer to dictionary entries by key, and the localization module selects the configured language or falls back to English when appropriate.

The checked-in dictionary includes three language codes:

| Code | Language |
| --- | --- |
| en | English |
| es | Spanish |
| ja | Japanese |

The localization helper also uses the browser's preferred language when no explicit supported setting is available. Missing translation keys cause warnings and fall back to the key itself, helping developers identify incomplete copy.

When adding a new translation, keep the key structure consistent across languages and check that all keys used by HTML and JavaScript exist in each dictionary. The custom element currently assigns translation output to innerHTML; translations should therefore come only from trusted maintained dictionaries, and user/service data should not be routed through the localization HTML path.

## Updater integration

The main module calls the Tauri updater's check function during startup. If an update is reported as available, the UI displays a message and calls downloadAndInstall. Errors are logged to the console.

This is only a frontend integration point. The actual update feed, signature verification, platform packaging, installer permissions, and restart behavior require host-side configuration not present in this repository. A successful check is not the same as a successfully installed update.

A reliable packaged application should test the updater on a staging release, handle no-update and update-available responses, provide clear errors when downloads fail, and avoid telling the user that a new version is installed until the host confirms it.

## Remote dependencies and network services

The frontend references several external systems:

| Service or dependency | Visible use | Operational note |
| --- | --- | --- |
| Nocturno service domain | Authentication-related links, account page, branch/API operations | Availability and server-side behavior are external to this repository |
| Nocturno client WebSocket | Live friend/user-presence and launcher messages | Requires network connectivity and a valid session |
| Sentry hosted script | Browser-side diagnostics initialization | Review data collection, identifiers, retention, and privacy expectations |
| Hosted launcher hotfix script | Loaded from nocturno.cc by index, login, and social pages | Remote JavaScript can change runtime behavior without a source change in this repository |
| Tauri updater feed | Update check and install request | Requires host-side updater configuration |
| Discord RPC host integration | Activity payload submission | Requires configured native RPC support |

### Remotely loaded hotfix

Each of the three HTML entry pages loads a JavaScript file from the Nocturno website with a page-specific query parameter. The file is not included in this repository tree. Therefore, someone reviewing only the GitHub source cannot determine all behavior that this remote script may add at runtime or whether it changes over time.

This is an important reproducibility and supply-chain consideration. For a stable release, maintainers should document the hotfix's purpose, ownership, change history, and rollback strategy. Consider bundling the script with the release or pinning/verifying the exact version using an appropriate integrity strategy. The current repository does not provide enough evidence to audit the remote file's present contents.

### Backend endpoints and contracts

The frontend uses service paths such as the blog API, branch metadata API, branch file retrieval endpoint, account exchange-code path, and WebSocket client API. These paths describe the frontend's expectations; they do not guarantee that the backend is online or that the response schema will remain the same.

Whenever a service response format changes, update the frontend's parsing and error handling together. Prefer typed/validated response schemas and explicit server error messages rather than assuming every successful HTTP response contains the expected JSON properties.

## Repository structure

```text
Project-Nocturno/
├── README.md
├── index.html
├── login.html
├── social.html
├── _lang.json
├── css/
│   ├── font.css
│   ├── login.css
│   ├── social.css
│   └── style.css
├── font/
│   ├── BrutalType-*.otf
│   └── GenEiGothicPro-*.otf
├── js/
│   ├── common.js
│   ├── localizer.js
│   ├── login.js
│   ├── settings.js
│   └── lib/
│       └── TweenMax.js
└── module/
    ├── constants.js
    ├── discord_rpc.js
    ├── main.js
    ├── social.js
    ├── version.js
    └── websocket.js
```

This tree describes the files visible in the current GitHub snapshot. It intentionally does not invent missing images, a package manifest, Tauri configuration, Rust source, a lockfile, or build scripts.

## File-by-file reference

### index.html

The main launcher page. It loads the shared styles, localizer, TweenMax animation library, common behavior, launcher/version/WebSocket/Discord modules, Sentry's hosted script, and the remote launcher hotfix. The body contains the user dropdown, launcher controls, game manager overlay, version editor, settings, and home/news areas.

The file is an HTML shell: core actions are implemented in the linked modules and native host.

### login.html

The access-code login page. It loads login-specific styling and the login/common scripts. It exposes window controls, the code input, login submission button, and a link that opens the Nocturno launcher-access page in an external browser.

### social.html

The friend/presence window. It loads social styles, shared localization and animation code, the social module, constants, Sentry, and the remote hotfix. It defines expandable friend groups and the context-menu container.

### module/main.js

Owns the main UI state and orchestration. It initializes user/config state, loads blog data, registers launch and settings controls, displays status, manages launch-button state, restores window size and language, checks for updates, and requests authentication state. It also provides the offline-mode entry point and writes config JSON.

### module/version.js

Owns known-version mapping, local version import, version editing/deletion, branch metadata loading, local file hash comparison, branch file download requests, normal launch preparation, and game-server launch preparation. It emits launch-related events but relies on native Tauri handlers for filesystem and process operations.

### module/constants.js

Defines the click-listener helper, button flags/states, user status values, and default configuration. The constants shape is part of the contract used by the main and version modules.

### module/social.js

Consumes social initialization and presence events, groups friends by relationship/status, updates presence indicators, and constructs the friend context menu. In this revision the context-menu action dispatcher does not implement the selected actions.

### module/websocket.js

Creates the live WebSocket connection, sends the initial authentication message, caches the last message for each type, forwards messages into local Tauri events, and schedules a retry after close. It has a debug logging flag that is enabled in the checked-in file.

### module/discord_rpc.js

Converts service-provided game/session data into a Discord Rich Presence payload and submits it through a native Tauri command. It expects a valid FortBasicInfo entry inside the custom data array.

### js/login.js

Validates the numeric access code, submits it through the Tauri host, parses the authentication response, checks for an access token, persists the returned JSON to the user file, and navigates to the launcher page.

### js/common.js

Shared page behavior, Sentry initialization, window maximize-state handling, keyboard/context-menu restrictions, renderer logging, and shared Tauri-window event behavior.

### js/localizer.js

Loads the translation dictionary, defines the localized-text custom element, resolves nested translation keys, and populates the language selector and localized placeholders.

### js/settings.js

Implements the settings overlay's open/close animation using TweenMax and controls the settings panel's visible state.

### css/style.css

Visual styling for the main launcher, version manager, settings overlay, launch controls, cards, status indicators, and related components.

### css/login.css

Styles the login window, access-code controls, background, and window chrome.

### css/social.css

Styles the social window, toolbar, friend groups, presence indicators, and context menu.

### css/font.css and font/

Define and supply local font families used by the interface. Confirm font redistribution rights before packaging them in a public binary.

### js/lib/TweenMax.js

A bundled animation library used by the settings UI and other interface transitions. Keep the library's license/copyright information with the distribution and avoid editing the vendor file manually.

### _lang.json

A nested JSON dictionary for English, Spanish, and Japanese. The UI references keys through the localizer rather than duplicating all labels in each page.

## Technology and dependencies visible in the frontend

The checked-in UI demonstrates use of:

- **Tauri APIs:** desktop window control, filesystem access, dialogs, events, commands, shell opening, deep links, and updater integration.
- **HTML and CSS:** window layouts and interaction surfaces.
- **JavaScript ES modules:** separation of launcher, version, social, WebSocket, and Discord behavior.
- **WebSocket:** live service messages and status updates.
- **TweenMax:** interface animation.
- **Sentry:** browser-side error reporting initialization.
- **Discord RPC integration:** activity mapping routed through the Tauri host.
- **JSON:** persisted config, local branch metadata, language dictionary, and service message payloads.

The repository contains no package.json or build tooling in the visible tree, so do not infer exact Tauri, Rust, JavaScript runtime, or plugin versions from the frontend imports alone.

## Installation and development limitations

### Why opening index.html directly is not enough

This is not a self-contained website. The frontend assumes that a Tauri host has populated the global Tauri APIs and registered native commands. Opening index.html directly in a normal browser will not provide the required commands for authentication, filesystem operations, window controls, version scanning, hash calculation, downloads, launching, updater installation, or Discord RPC.

### What is needed for a reproducible development setup

A complete development checkout needs the matching Tauri native host, its configuration and permissions, any Rust/native command implementations, a compatible runtime/toolchain, image assets used by the HTML/CSS, and a documented way to launch and package the desktop application. None of those missing items should be invented as if they were included here.

For a maintainer who has access to the matching application source:

1. Confirm that the native host version matches the frontend modules.
2. Confirm that each invoke command used in the frontend is registered by the host.
3. Confirm that Tauri permissions permit only the necessary paths, commands, and URLs.
4. Confirm that the expected UI image assets are present in the distribution.
5. Use dedicated test credentials and non-production service settings.
6. Run the app through the official development command from the complete project, not by opening the HTML file directly.
7. Verify login, local build import, branch preparation, launch requests, offline mode, social connection, and updater behavior individually.

The current frontend-only repository does not supply enough information to provide a verified one-command installation or build command.

### Existing external download reference

The original repository README included an external Gofile link. This README does not verify the contents, publisher, integrity, or current availability of that external file. Treat it as an unverified external distribution reference; inspect any downloaded archive and verify its origin before running binaries.

## Troubleshooting

### The launcher opens a blank screen

Check whether the page assets exist, including images referenced from the img directory, fonts, CSS, and JavaScript modules. If the UI is opened without the Tauri host, calls to the global Tauri API will fail. Use the proper desktop package or the full development environment.

### The app remains on the loading screen

The main module requests authentication state and waits for a user object. Check network access, saved account data, the native authentication command, and the response shape. The visible five-second timeout enables an error/ retry/offline UI; it does not establish the underlying cause.

### Login fails after entering the code

The frontend expects a nine-character numeric code and a response that parses as JSON containing an access token. A parse error, service-side error, missing token, unavailable native command, or write failure can stop the flow. Review sanitized logs without exposing the code or user.json contents.

### A local version cannot be imported

Confirm that the selected directory is a valid game build and contains exactly one executable that the native scan recognizes. The frontend calls walk_fortnite_binary and scan_fortnite_version. Since their implementation is not in this repository, detailed path support depends on the host version.

### A known version appears as Unknown

The frontend compares the detected build string with a hard-coded known-version list. If the binary has been modified, belongs to another build, or returns a new version string, it may not match. The editor can still store a version record, but branch selection should be checked carefully.

### Branch preparation fails

Check connectivity, service authentication, the branch metadata schema, local PAK directory existence, destination write permissions, and the native download_url command. The frontend expects branch metadata to include a non-empty files list and reference values for local file comparison.

### A download button shows an error message

This is intentional in the checked-in main module: full game-version downloading is disabled by the UI. Do not interpret that button as the same operation as branch file preparation.

### Game launch does not start

The frontend emits a launch-fortnite event with a selected path and metadata. Confirm that the host registers a matching listener and successfully handles the process start request. Check the selected executable path, branch preparation result, exchange-code response, runtime arguments, and native logs. This frontend repository cannot confirm the host's process-launch implementation.

### Offline mode has no branches

The frontend reads cached JSON files from the local branch cache directory. If those files are absent or invalid, the branch list can be empty. Offline mode cannot fetch new server data while disconnected.

### Friends or presence are not updating

Check whether the WebSocket opens, authentication succeeds, and expected message types are received. The module reconnects after a close with a fixed delay. Inspect sanitized diagnostics and ensure the service still sends the expected social_init and social_presence_update message shapes.

### Friend context-menu buttons do nothing

The visible context menu is present, but handleClick currently does not dispatch any actions. This is an implementation limitation, not necessarily a network problem.

### Discord Rich Presence is missing

The module expects an RPC payload from the WebSocket and sends the formatted result to the native custom_rpc command. Confirm Discord is available, the native RPC handler is configured, and the incoming custom data includes FortBasicInfo.

### Updates do not install

The frontend checks the Tauri updater and calls downloadAndInstall when an update is available. The update feed, package signature, platform target, and installer are managed by the host/distribution configuration, which is absent here.

## Security and privacy review

This section records code-review concerns visible in this frontend. It is not a penetration test and does not prove that a vulnerability is exploitable in every distribution. The missing Tauri host and remote script prevent a full security assessment.

### 1. Sensitive data in logs

The login/main/WebSocket code logs authentication or service data in some flows. The launch path logs the exchange code, and the main auth handler logs the returned authentication object. The WebSocket debug mode logs received message objects. Depending on payloads, this may expose account identifiers, access tokens, exchange codes, friend metadata, or other sensitive fields.

**Recommendation:** remove credentials from console output, redact secrets before telemetry, and log only status, event type, operation IDs, and sanitized error classes.

### 2. Locally stored access token

The frontend writes the authentication response to user.json beneath APPDATA. That file should be treated as sensitive credential storage. Its actual filesystem permissions and lifecycle depend on the Tauri host.

**Recommendation:** use secure platform storage when available, ensure local access permissions are appropriate, delete or invalidate session state on sign-out, and never request users to upload user.json.

### 3. Remote JavaScript loaded at runtime

All three page entry points load a hotfix script from the Nocturno domain. That code is not versioned in this repository tree and can change independently of the Git commit.

**Recommendation:** document ownership and purpose, pin or package reviewed releases where feasible, use integrity verification where compatible, and include remote-script changes in release review.

### 4. Service data inserted into HTML

Blog cards and social friend entries are constructed from strings that contain fields returned by services. Inserting remote values directly into innerHTML can cause markup interpretation if the values are not trusted or escaped.

**Recommendation:** create DOM nodes and use textContent for usernames, titles, status, and other text fields. Validate URLs separately before opening them. Review all API-derived values, not only fields that look like HTML.

### 5. URL handling

The frontend opens URLs using a native shell API, including blog links and the account page. The native layer should validate permitted schemes and prevent unintended protocols.

**Recommendation:** allow only intentional http/https URLs for web content, validate redirects, and do not allow service-provided URLs to invoke arbitrary local handlers.

### 6. File operations

Branch preparation can rename PAK files, download files to selected paths, and cache metadata. The frontend relies on native file operations and does not show all the validation performed by the host.

**Recommendation:** normalize paths in the host, confine write/rename operations to approved roots, validate manifest filenames and file sizes, avoid following unintended links, and make destructive changes recoverable.

### 7. Network and authentication trust

The WebSocket sends a stored access token to the configured Nocturno service endpoint. Service availability, TLS behavior, token acceptance, and server-side authorization are not verifiable from the frontend-only source.

**Recommendation:** use secure connections, validate service destinations in the host, expire/revoke credentials correctly, and test failure responses without putting credentials in logs.

### 8. Tauri permissions and command surface

Tauri commands can grant filesystem, process, shell, updater, environment, and network capabilities. The native configuration that defines these capabilities is not present in this repository.

**Recommendation:** review the matching host's permissions and command implementations with least privilege. Every command that accepts a path, URL, executable argument, branch name, or token must validate its inputs again in the privileged layer.

### 9. Untrusted external archive

The Gofile link in the original README points to an external file whose contents are not represented in the repository. The README cannot certify it.

**Recommendation:** publish release artifacts through a controlled release channel, provide checksums/signatures, document supported platforms, and keep release provenance with the project.

## Known limitations and incomplete features

The following items are directly indicated by the current frontend or by the missing parts of the repository:

1. **No standalone app build:** no package manifest, Tauri config, or native backend appears in this repository tree.
2. **Version downloading is disabled:** the main-page button explicitly shows a disabled-feature message.
3. **Social context actions are incomplete:** the handler reads an action identifier but does not implement it.
4. **The native host is required:** version scanning, file hashing, downloads, authentication, process launching, and RPC depend on Tauri commands not defined in these files.
5. **Remote hotfix is not audited here:** the externally loaded JavaScript file is absent from the repository.
6. **Image assets referenced by the UI are not in the visible tree:** verify that they are included in the actual distribution.
7. **WebSocket messages are logged in debug mode:** received objects may contain sensitive account/session data.
8. **The version list is partly hard-coded:** new or modified build strings may not map to a known version automatically.
9. **The social context menu is visual only for now:** the visible remove/block/accept/cancel/mute labels do not have working dispatch code here.
10. **End-to-end update behavior is unverified:** it depends on host updater configuration and packaged releases.
11. **Offline mode depends on cached metadata:** it cannot create remote data or guarantee every local game file exists.
12. **No automated tests are included in this repository snapshot:** the current tree does not contain a visible test suite or CI workflow.

These caveats should be updated when implementation changes are committed and tested. The presence of a UI route, command call, or state name should not be used as the sole evidence that a feature works end to end.

## Recommended development roadmap

The priorities below are recommendations, not claims of completed work.

### Priority 1 — Make releases reproducible

- Include or link to the matching Tauri host source and configuration.
- Restore a documented build/development command and required toolchain versions.
- Confirm all expected image/font assets are in the release tree.
- Document which platforms and architectures are actually supported.
- Record release checksums and provenance for external binaries.

### Priority 2 — Improve credential safety

- Redact access tokens, exchange codes, and full auth payloads from logs.
- Confirm user.json permissions and session deletion behavior.
- Review Sentry collection and define data retention expectations.
- Avoid placing sensitive credentials into general debug output.
- Add authentication tests with safe test credentials.

### Priority 3 — Harden input and file operations

- Escape service-provided text inserted into HTML.
- Validate URLs before passing them to native shell commands.
- Validate paths and names in branch metadata in the native host.
- Make file replacement and PAK renaming recoverable.
- Check downloaded files against trusted expected hashes before marking preparation complete.
- Reject malformed JSON and unexpected service response shapes with useful errors.

### Priority 4 — Complete the visible features

- Implement friend context-menu actions or hide/disable unfinished options.
- Define clear states for login, WebSocket connection, branch preparation, launch request, and process lifecycle.
- Improve offline-cache validation and error recovery.
- Add a complete error path for missing FortBasicInfo in the Discord activity formatter.
- Ensure reconnect logic does not create multiple simultaneous WebSocket instances.
- Provide a real status for the launch request rather than relying exclusively on UI button state.

### Priority 5 — Improve maintainability

- Separate shared UI logic from page-specific modules.
- Add type definitions or a documented schema for config, version entries, branch metadata, WebSocket messages, and launch payloads.
- Add automated tests for pure JavaScript helpers and mocked service responses.
- Add a CI check for JSON validity, syntax, and missing assets.
- Maintain this README alongside actual implementation changes.
- Use a changelog to record compatibility and configuration changes.

## Testing checklist

The following checklist can guide future maintainers. It is a proposed plan, not a record of tests already passed.

### Project and startup

- [ ] The matching Tauri host builds from a clean checkout.
- [ ] All HTML, JavaScript, CSS, font, and image assets load in the packaged app.
- [ ] The application starts when the user data directory is empty.
- [ ] Invalid config JSON falls back safely without losing unrelated user files.
- [ ] An update check failure does not prevent the main interface from opening.

### Authentication

- [ ] Empty, short, non-numeric, and invalid codes show a safe error.
- [ ] Malformed authentication JSON is handled without a crash.
- [ ] A response without an access token does not create a signed-in UI.
- [ ] Successful authentication persists only expected fields.
- [ ] Sensitive values never appear in logs.
- [ ] Sign-out removes or invalidates the correct local session state.

### Version management and branch preparation

- [ ] Import rejects a directory without a matching executable.
- [ ] Import handles more than one candidate executable.
- [ ] Known and unknown build strings behave correctly.
- [ ] Saving, editing, selecting, and deleting versions update config consistently.
- [ ] Missing branch metadata, an empty file list, and malformed metadata return clear errors.
- [ ] Hash mismatches trigger the intended download path.
- [ ] PAK rename operations remain within the selected build directory.
- [ ] An interrupted preparation can be diagnosed and repaired.

### Launch workflow

- [ ] Launch with no selected version produces a visible error.
- [ ] Launch with a missing executable path is rejected.
- [ ] Branch preparation errors do not leave the button stuck in BUSY.
- [ ] Exchange-code errors do not emit a launch request.
- [ ] The native host validates the final path and runtime arguments.
- [ ] Launch and close events update the button state only when appropriate.
- [ ] The hide-launcher option is handled correctly by the host.

### Offline and social features

- [ ] Offline mode works with valid cached branch metadata.
- [ ] Missing or invalid cached files produce a useful message.
- [ ] WebSocket reconnection is bounded and does not create duplicate connections.
- [ ] Malformed WebSocket JSON does not stop future message processing.
- [ ] Incoming social data is escaped before display.
- [ ] Friend context actions are only displayed if they have working implementations.
- [ ] Discord RPC handles missing custom data and offline Discord gracefully.

### Security and release process

- [ ] External URLs are validated in the native host.
- [ ] Native commands reject paths outside permitted locations.
- [ ] Remote hotfix behavior is documented and reviewed.
- [ ] User data and log files are checked for accidental secret disclosure.
- [ ] Font and animation-library licenses are preserved.
- [ ] Release artifacts have verified provenance and checksums.
- [ ] The README's feature claims match the code and the tests actually run.

## Contributing

Contributions should accurately describe their scope and should not promote incomplete functionality as finished. Before submitting changes:

1. Identify the frontend module and native command involved.
2. Document inputs, outputs, side effects, and failure responses.
3. Keep access tokens and account data out of committed test fixtures.
4. Validate remote data before rendering or writing files.
5. Test both normal behavior and a relevant failure case.
6. Update this README when supported features, runtime requirements, or limitations change.
7. Preserve licensing notices for fonts and bundled vendor code.

When a change depends on the missing Tauri host, review the frontend and native implementation together. A frontend call can compile while still pointing to an unregistered or incompatible command.

## Bug reports

A useful bug report should contain the operating system, launcher version if available, repository commit, the exact screen/action, steps to reproduce, expected behavior, actual behavior, and relevant sanitized logs.

Do not attach user.json, raw access tokens, exchange codes, cookies, private account details, complete game builds, or private download URLs. If authentication information has been exposed, revoke or rotate it using the official account/service process.

For errors involving a native command, identify the command name and the frontend module that invoked it. This helps determine whether the issue is in the UI contract, the native host, or the remote service.

## Frequently asked questions

### Is Nocturno affiliated with Epic Games?

The included language dictionary explicitly says Nocturno is not affiliated with Epic Games. This repository provides no evidence of an official relationship.

### Can this repository build the complete launcher by itself?

Not from the visible contents alone. The tree does not contain a package manifest, Tauri configuration, or native host source. A matching full application repository or distribution toolchain is required.

### Can the launcher download full Fortnite versions?

The current UI explicitly says full version downloading is disabled and tells users to source their own game files. The branch-preparation logic is a separate workflow for files associated with an already imported local build.

### Why does the frontend use Tauri commands?

The frontend needs desktop capabilities such as filesystem access, environment variables, native dialogs, service requests, update installation, and launch requests. Those commands must be implemented by the host application.

### Does the social menu currently manage friends?

The UI renders context-menu items, but the click handler does not implement the actions in this revision. Do not treat those actions as functional based on their labels alone.

### What does offline mode guarantee?

It enables a local UI path based on cached branch JSON. It does not guarantee that all local game files are valid or that online-only authentication and services work.

### Are the remote scripts part of this repository?

The Sentry loader and a Nocturno hotfix script are referenced by URL in the HTML, but their remote source code is not included in the repository tree. Their full runtime behavior cannot be established from this README or these files alone.

### Is it safe to share the configuration or user file?

The config may contain local paths and settings, and user.json is written from an authentication response containing an access token. Do not share user.json publicly and review config/log contents before uploading them.

## Credits and project boundaries

Project Nocturno's repository contains frontend work, local assets, and integrations for a Tauri desktop experience. The full behavior also depends on the native host, server APIs, and remotely hosted scripts referenced by the frontend. Keep those boundaries clear when documenting support and when diagnosing issues.

The original repository included a Gofile download reference. Its contents and integrity cannot be verified from the checked-in source. Prefer official project releases with checksums and clear provenance when available.

Nocturno's included description frames it as a community project for older Fortnite: Save the World experiences and states that it is not affiliated with Epic Games. Third-party names, game files, images, service endpoints, and font assets should be used only where the maintainer has permission and where the applicable terms allow it.

---

**Repository:** [troon-dev/Project-Nocturno](https://github.com/troon-dev/Project-Nocturno)  
**Main page:** index.html  
**Frontend modules:** module/  
**Translations:** _lang.json

