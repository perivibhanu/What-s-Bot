# 📱 Velammalitech — WhatsApp-Based Smart College Management System
### Project Proposal Document
**Prepared for:** The Principal, Velammal College of Engineering and Technology (VCET)
**Prepared by:** Velammalitech Development Team
**Date:** June 2026
**Version:** 1.0

---

## 📌 Executive Summary

**Velammalitech** is a smart, WhatsApp-based college management and information system designed specifically for Velammal College of Engineering and Technology (VCET). The platform bridges the communication gap between the college administration and its two key audiences:

1. **Existing Students** — who can instantly access marks, attendance, timetables, fees, and circulars directly from WhatsApp, without needing to install any app.
2. **Prospective Students / New Visitors** — who can explore the college, view department videos and photos, check facilities (hostel, sports, hospital, etc.), and get a complete picture of VCET before admission.

No app installation is required. Everything works through **WhatsApp**, which every student and parent already uses daily.

---

## 🔴 Problem Statement

| Problem | Current Situation |
|---------|------------------|
| Students miss important circulars | Circulars are posted on notice boards or emailed — often missed |
| Parents don't get real-time updates | No direct communication channel between college and parents |
| New students lack college information | Prospective students visit in person or rely on outdated brochures |
| Staff spends hours answering repeated queries | Same questions about fees, timetables, marks asked repeatedly |
| Multiple apps needed | Separate portals for marks, attendance, fees — students find it confusing |

---

## 💡 Project Overview

Velammalitech solves all the above problems by creating a **single WhatsApp number** that serves as the college's intelligent assistant.

```
Student/Visitor sends "Hi" on WhatsApp
           ↓
    Smart bot responds instantly
           ↓
    Serves personalised information
    in seconds — 24/7, no human needed
```

### The system has two core modules:

| Module | Purpose |
|--------|---------|
| **🤖 WhatsApp Bot** | Automated responses to students and new visitors |
| **🖥️ Admin Panel** | Web dashboard for staff to manage all content |

---

## 🤖 WhatsApp Bot — Features

### For New Visitors / Prospective Students

When a new person sends **"Hi"** to the college WhatsApp number:

```
👋 Welcome to VCET!
Velammal College of Engineering and Technology

[🎓 Student Login]   [🏫 About College]
```

**If they choose "About College":**
- College introduction video plays automatically
- Campus photos are shown
- A menu of 10 topics appears:

| # | Topic | Content |
|---|-------|---------|
| 1 | 🏛️ Departments | 7 sub-departments (AIDS, CSE, ECE, EEE, IT, Mechanical, Mechatronics) with photos & videos |
| 2 | 💼 Placements | Placement records, company logos, student success stories |
| 3 | 🔬 Projects | Student project showcases, research highlights |
| 4 | 📚 Academics | Academic programs, faculty highlights |
| 5 | 🏆 Achievements | Awards, rankings, recognitions |
| 6 | 🏠 Hostel | Hostel rooms, facilities, life on campus |
| 7 | 🚌 Transportation | Bus routes, fleet photos |
| 8 | ⚽ Sports | Sports facilities, courts, achievements |
| 9 | 🏥 Hospital | On-campus medical facilities |
| 10 | 🍽️ Hostel Food | Canteen, dining hall, menu samples |

> Each topic sends **real photos and videos** uploaded by the admin — no static text brochures.

---

### For Existing Students (Verified Login)

Students enter their **Registration Number** — the system verifies it against the database and their phone number. Once verified, they get a personalised menu:

```
Welcome back, [Student Name]! 👋
What would you like to check?

┌─────────────────────────────────┐
│  📢 Current Updates             │  ← Principal circulars
│  📚 Academics                   │  ← Marks, Attendance, Timetable
│  🚌 Transportation              │  ← Bus routes & boarding details
│  💰 Fee Balance                 │  ← Fee check + UPI QR payment
└─────────────────────────────────┘
```

#### Student Feature Details:

| Feature | What it does |
|---------|-------------|
| **📢 Current Updates** | Sends the latest principal circular (PDF/image) instantly |
| **📊 Marks** | Shows Mid-1, Mid-2, Model exam marks per subject |
| **📅 Attendance** | Shows attended classes, total classes, percentage |
| **🕐 Timetable** | Sends class schedule image/PDF for their branch & section |
| **🚌 Transportation** | Sends master bus list + personal bus & boarding point |
| **💰 Fee Balance** | Shows total, paid, and pending fees |
| **💳 Fee Payment** | Generates UPI QR code for instant payment via GPay/PhonePe |
| **📄 Seating Arrangement** | Sends exam room & seat number before exams |

---

## 🖥️ Admin Panel — Features

The college staff manages everything through a **professional web dashboard** accessible from any browser.

### Dashboard Sections:

| Section | Functionality |
|---------|--------------|
| **👨‍🎓 Student Management** | Add, edit, import students via Excel; view individual profiles |
| **📊 Send Marks** | Upload marks per batch/branch; bulk Excel import |
| **📅 Update Attendance** | Bulk update attendance percentages via Excel |
| **🕐 Upload Timetables** | Upload timetable images/PDFs per branch, section, batch |
| **🚐 Transportation** | Upload master bus route Excel file |
| **💰 Fee Management** | Bulk update student fee balances |
| **📄 Principal Circulars** | Upload & broadcast circulars to all registered students instantly |
| **🏫 About College Media** | Upload photos & videos for all 10 college topics + 7 departments |
| **⚙️ Settings** | Configure welcome message, college website link, contact number |

### About College Media Manager:
- **College Overview** section: upload intro video + campus photos
- **7 Department Drill-Down**: click Departments → see AIDS, CSE, ECE, EEE, IT, Mechanical, Mechatronics → click any dept → upload photos & videos for that specific department
- **10 Topic Cards**: each with a gallery preview, drag-to-delete, and caption support
- All media stored directly on the **College's Google Drive** — unlimited, free, and completely under the college's control

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WhatsApp Business API                  │
│                     (Meta Cloud API)                      │
└──────────────────────┬──────────────────────────────────┘
                        │  Webhook
┌──────────────────────▼──────────────────────────────────┐
│                  VCET Backend Server                      │
│                  Node.js + Express.js                     │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│   │ Chat Engine │  │   REST API   │  │  File Upload  │  │
│   │ (State Bot) │  │ (Admin APIs) │  │ (Google Drive)│  │
│   └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                        │
┌──────────────────────▼──────────────────────────────────┐
│                  MongoDB Database                         │
│  Students | Marks | Attendance | Timetables | Circulars  │
│  Fees | Transport | College Media | Chat Sessions        │
└─────────────────────────────────────────────────────────┘
                        │
┌──────────────────────▼──────────────────────────────────┐
│               React Admin Panel (Web)                     │
│         Accessible from any browser — no install          │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack:

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Node.js + Express | Fast, scalable, industry standard |
| Database | MongoDB Atlas | Cloud-hosted, no server needed, reliable |
| Media Storage | Google Drive API | Unlimited free storage using the college's domain |
| Bot API | WhatsApp Business Cloud API | Official Meta API — no bans, no restrictions |
| Frontend | React.js | Modern, responsive admin panel |
| Security | JWT Authentication | Secure admin access |
| Hosting | Render / Railway | Low-cost cloud hosting |

---

## 📊 Key Benefits

### For the College:
- ✅ **24/7 Automated Support** — No staff needed to answer common queries
- ✅ **Zero App Installation** — Students use WhatsApp they already have
- ✅ **Instant Mass Communication** — Send circulars to all students in one click
- ✅ **Professional Digital Image** — Impress prospective students with rich media
- ✅ **Data Security** — All data stored on secure cloud servers
- ✅ **Reduces Administrative Workload** — Staff spends less time on routine queries

### For Students:
- ✅ **Marks & Attendance anytime, anywhere** — No need to log into portals
- ✅ **Instant fee payment** via UPI QR code
- ✅ **Never miss a circular** — Delivered directly to WhatsApp
- ✅ **Bus & seating details** before exams — no confusion

### For New Admissions / Parents:
- ✅ **Virtual college tour** through photos & videos on WhatsApp
- ✅ **All departments explored** before visiting physically
- ✅ **Available 24/7** — parents can explore at any time

---

## 📅 Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1** — Setup & Configuration | Week 1 | Meta API setup, server deployment, admin panel launch |
| **Phase 2** — Student Data Import | Week 2 | Import all student records via Excel, attendance & marks |
| **Phase 3** — Media Upload | Week 2–3 | Upload dept photos, videos for all 10 topics |
| **Phase 4** — Staff Training | Week 3 | Train admin staff on using the dashboard |
| **Phase 5** — Pilot Launch | Week 4 | Launch with one department, collect feedback |
| **Phase 6** — Full Launch | Week 5 | Full college rollout, broadcast to all students |

> **Total setup time: 4–5 weeks from approval**

---

## 💰 Subscription Pricing Plans

*All plans include: WhatsApp Bot + Admin Panel + Google Drive Integration + Support*

---

### 🥉 Basic Plan — ₹2,499/month
**Best for: Small colleges (up to 500 students)**

| ✅ Included |
|------------|
| WhatsApp Bot for students |
| Marks, Attendance, Timetable, Fee features |
| Principal Circulars broadcast |
| Admin Panel (1 admin account) |
| Basic College Info (text only) |
| Email support |
| Up to 500 student records |
| **Unlimited media storage** (via Google Drive) |

---

### 🥈 Standard Plan — ₹4,999/month ⭐ *Recommended*
**Best for: Mid-size colleges (up to 2,000 students)**

| ✅ Included |
|------------|
| Everything in Basic |
| **About College** media feature (photos + videos) |
| **7 Department sub-menus** with individual media |
| Transportation management |
| Fee payment via UPI QR |
| Seating arrangement delivery |
| Admin Panel (3 admin accounts) |
| **Unlimited media storage** (via Google Drive) |
| WhatsApp + Phone support |
| Monthly analytics report |

---

### 🥇 Premium Plan — ₹7,999/month
**Best for: Large colleges (up to 5,000 students)**

| ✅ Included |
|------------|
| Everything in Standard |
| Unlimited student records |
| Unlimited admin accounts |
| **Unlimited media storage** (via Google Drive) |
| Custom college branding |
| Dedicated account manager |
| Priority 24/7 support |
| Quarterly feature upgrades |
| Custom feature requests |
| On-site staff training session |

---

### 💎 Annual Discount

| Plan | Monthly | Annual (Pay once) | Savings |
|------|---------|-------------------|---------|
| Basic | ₹2,499/mo | ₹24,990/year | Save ₹4,998 (2 months free!) |
| Standard | ₹4,999/mo | ₹49,990/year | Save ₹9,998 (2 months free!) |
| Premium | ₹7,999/mo | ₹79,990/year | Save ₹15,998 (2 months free!) |

---

### 🎁 One-Time Setup Fee

| Item | Cost |
|------|------|
| Initial setup, configuration & deployment | ₹15,000 (one-time) |
| Student data migration from existing system | ₹5,000 (one-time) |
| Staff training session (full day) | ₹5,000 (one-time) |
| **Setup bundle (all three above)** | **₹20,000** *(save ₹5,000)* |

> *Setup fee is waived for annual plan subscribers.*

---

### 📋 Feature Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Student count | 500 | 2,000 | Unlimited |
| Admin accounts | 1 | 3 | Unlimited |
| Cloud storage | Unlimited | Unlimited | Unlimited |
| Marks & Attendance | ✅ | ✅ | ✅ |
| Fee + UPI QR | ✅ | ✅ | ✅ |
| Circulars broadcast | ✅ | ✅ | ✅ |
| About College media | ❌ | ✅ | ✅ |
| Department sub-menus | ❌ | ✅ | ✅ |
| Transport management | ❌ | ✅ | ✅ |
| Seating arrangement | ❌ | ✅ | ✅ |
| Custom branding | ❌ | ❌ | ✅ |
| Dedicated manager | ❌ | ❌ | ✅ |
| Custom features | ❌ | ❌ | ✅ |
| Support | Email | Phone + WA | 24/7 Priority |

---

## 🔐 Security & Compliance

- All student data is stored on **MongoDB Atlas** (encrypted at rest and in transit)
- Admin panel is protected by **JWT token authentication**
- No student data is shared with third parties
- Media files are securely stored on the college's own **Google Drive**
- WhatsApp integration uses the **official Meta Business API** — compliant with WhatsApp policies

---

## 📞 Contact & Next Steps

To proceed with the Velammalitech system for VCET:

1. ✅ Select a subscription plan
2. ✅ Provide WhatsApp Business number for the college
3. ✅ Share student database (Excel format)
4. ✅ System goes live within 4–5 weeks

**For any queries or demo requests, please contact the Velammalitech team directly.**

---

> *This document is prepared exclusively for Velammal College of Engineering and Technology (VCET). All pricing and timelines are subject to final agreement.*

---
*© 2026 Velammalitech. All rights reserved.*
