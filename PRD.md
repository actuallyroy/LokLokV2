# **Product Requirements Document (PRD): LokLok**

### **Project Overview**

LokLok is an Android application that lets two users (typically couples or close friends) draw on their lock screens and have those drawings **synchronized between paired devices** in real time. The core experience revolves around creative, shared interaction through sketches directly on the device lock screen. ([GitHub][1])

---

## **Purpose & Vision**

LokLok aims to turn a user’s lock screen into a **shared interactive canvas** where two connected users can:

* Draw messages or sketches.
* See the other user’s drawings on their own lock screen.
* Experience expressive communication without opening a messaging app.

This transforms the lock screen into a low-friction, playful communication layer.

---

## **Target Users**

* Couples who want constant creative connectivity.
* Close friends who enjoy doodling and sharing visuals.
* Users looking for non-verbal asynchronous communication.

---

## **User Stories**

**As a user, I want to:**

* Pair my Android device with another user’s device securely.
* Draw or write on my lock screen using touch.
* Automatically sync drawings to my partner’s lock screen.
* Clear or modify drawings as needed.
* Receive visual feedback when the other user has made a new drawing.

---

## **Scope & Features**

### **1) Core Features (MVP)**

These are essential for the app to function as intended.

**Lock Screen Canvas**

* Persistent drawing overlay on lock screen.
* Multi-touch drawing support.
* Custom brush color and stroke size.

**Sync & Communication**

* Real-time synchronization between paired devices.
* A minimal pairing flow (e.g., QR code exchange or user tokens).

**Security & Privacy**

* Secure link between only two devices.
* Minimal data storage on servers (or local-only sync if possible).

---

### **2) Secondary Features (Future Enhancements)**

Drawing Tools:

* Eraser tool.
* Sticker or emoji placement.
* Undo/Redo support.

User Accounts and Discovery:

* Optional accounts for cloud backup.
* Searchable usernames for easier pairing.

Notifications:

* Optional alert when partner sketches something new.
* Timed daily drawing reminders.

Themes & Personalization:

* Background lock screen templates.
* Brush effects (e.g., gradients, glow).

---

## **Functional Requirements**

**Lock Screen Drawing**

* Must respond to user touch with minimal lag.
* Must not interfere with unlock gestures (PIN, fingerprint, etc.).

**Sync Protocol**

* Must use a lightweight real-time backend (WebSockets / Firebase / MQTT).
* Must retry on network loss and sync once reconnected.

**Security**

* Authentication tokens must be encrypted.
* Sync data should be minimal and ephemeral.

---

## **Non-Functional Requirements**

**Performance**

* Drawing must feel fluid (<16ms touch-to-render latency).
* Sync updates must propagate within 1–2 seconds.

**Scalability**

* Backend must support numerous connections concurrently.
* Efficient use of mobile data.

**Reliability**

* App must handle network loss gracefully.
* Users should not lose drawings when offline; queue for sync.

**Compatibility**

* Android 8.0+ supported.

---

## **UX & UI Considerations**

**Lock Screen Mode**

* The drawing overlay should be clear but unobtrusive.
* Must integrate with Android lock screen wallpapers.

**Pairing Flow**

* Simple step-by-step onboarding for first-time users.
* Visible status (Connected / Disconnected).

**User Controls**

* Clear buttons for “Clear all drawings.”
* Confirmations before delete.

---

## **Technical Architecture**

**Frontend**

* Android app written in Java (currently 100% Java). ([GitHub][1])
* Draw view implemented as a custom View or Service on lock screen.

**Sync Layer**

* Backend real-time engine (Firebase Realtime Database or WebSockets).
* Lightweight REST endpoint for pairing and token exchange.

**Security**

* Use OAuth2 or token-based secure pairing.
* SHA-256 encrypted session tokens.

---

## **Success Metrics**

User engagement can be measured by:

* Daily Active Devices (DAD).
* Number of paired device pairs.
* Average number of drawings per session.
* Sync latency (average <2s).

---

## **Risks & Mitigations**

**Risk:** Lock screen integration may get blocked by Android OEMs or newer Android policies.
**Mitigation:** Ensure permissions are clearly requested; adapt to Android’s keyguard API.

**Risk:** Sync delays or data loss on poor networks.
**Mitigation:** Implement offline queue and retry logic.

---

## **Deliverables (Iteration 1)**

* Functional Android APK with:

  * Drawing on lock screen.
  * Sync between two devices.
  * Basic pairing flow.
* Unit tests for core drawing and sync logic.
* Documentation for:

  * Architecture
  * API contracts
  * Future enhancements
