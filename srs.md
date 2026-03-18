Digital Directory System   |   Software Requirements Specification v2.0 
SOFTWARE 
REQUIREMENTS 
SPECIFICATION 
Digital Directory System 
Prepared For 
Developed By 
Abid Siddique Chaudhry 
Muhammad Husnain Ramzan 
Company Labverse.org(Junaid Aslam) 
Version 
Document Type 
Status 
2.0 — Enhanced 
Software Requirements Specification (SRS) 
Final  
Project By 
The World Ambassador 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
1. Introduction 
1.1 Purpose 
This Software Requirements Specification defines all functional and non-functional requirements for 
the Digital Directory platform — a multi-country, multi-city business directory system built on a single 
centralized backend with country-based subdomain routing. The document is intended to serve as 
the complete technical and operational blueprint for design, development, testing, and client 
presentation. 
1.2 Scope 
Digital Directory is a subscription-based, scalable web platform that enables business owners 
across multiple countries to register, manage, and promote their businesses. The system supports 
multi-country and multi-city structures, business profiles with media, product and service listings, 
branch management, subscription plans, payment processing, and a full administrative control 
panel. All operations are managed through one backend system with intelligent subdomain-based 
country routing. 
1.3 Intended Audience 
This document is prepared for the project client, the backend development team at Labverse.org, 
and any future stakeholders or reviewers involved in the delivery or maintenance of the Digital 
Directory platform. 
1.4 Definitions and Abbreviations 
Term 
SRS 
Definition 
Software Requirements Specification 
Subdomain 
A prefix to the main domain that identifies a country, e.g. 
uk.digitaldirectory.com 
Business Owner 
A registered user who creates and manages one or more business 
listings 
Super Admin 
The top-level administrator with full system access 
JWT 
Stripe 
JSON Web Token — used for stateless authentication 
Third-party payment processing provider 
NodeMailer 
Cloudflare R2 
Node.js library used to send transactional emails 
Object storage for media files, integrated with Cloudflare CDN 
RBAC 
Role-Based Access Control 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Term 
FK / PK 
CDN 
Webhook 
Definition 
Foreign Key / Primary Key — relational database constraints 
Content Delivery Network for fast static asset delivery 
HTTP callback triggered automatically by Stripe on payment 
events 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
2. System Overview 
Digital Directory is a centralized multi-tenant platform where a single backend serves all countries 
simultaneously. Country filtering is handled dynamically through subdomain extraction from the 
HTTP request, ensuring that each visitor automatically sees only the businesses relevant to their 
country without any manual selection required. 
 
The architecture is designed around the principle of a single source of truth — one backend, one 
database, and one unified admin panel — while maintaining logical separation of country-specific 
data through intelligent query filtering. This approach eliminates infrastructure redundancy, 
simplifies maintenance, and enables unlimited geographic expansion without additional servers. 
 
2.1 High-Level Architecture 
Layer Technology Responsibility 
DNS & CDN vesel Wildcard subdomain routing, SSL termination, 
media CDN 
Frontend Web Application Country-specific UI served per subdomain 
Backend Node.js + Express Single API handling all countries via 
subdomain context 
Database PostgreSQL Centralized data store with relational integrity 
Media Storage Cloudflare R2 Scalable object storage for images, videos, 
PDFs 
Authentication JWT (JSON Web 
Tokens) 
Stateless, role-based auth across all users 
Payments Stripe Subscription billing, webhooks, invoicing 
Email NodeMailer Transactional notifications and alerts 
 
2.2 Subdomain Examples 
The platform uses wildcard DNS to route country-specific traffic. Every subdomain points to the 
same server, and the backend determines the active country from the request host header. 
 
Country Subdomain URL Country Code 
United Kingdom uk.digitaldirectory.com UK 
South Korea korea.digitaldirectory.com KR 
Pakistan pakistan.digitaldirectory.com PK 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
US 
United States 
us.digitaldirectory.com 
Germany 
germany.digitaldirectory.com 
Any New Country 
DE 
country.digitaldirectory.com 
Auto-configured 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
3. Core Modules 
The platform is composed of eight major functional modules, each designed to operate 
independently while contributing to the unified system. Together they form the complete Digital 
Directory ecosystem. 
3.1 Module 1 — Admin Panel 
The Admin Panel is the centralized command center for the entire platform. The Super Admin has 
unrestricted access to all system functions across every country and city. 
• Country Management: Create, edit, and deactivate countries. Each country record includes 
its name, country code, and unique subdomain identifier. 
• City Management: Add and manage unlimited cities under each country. Cities are always 
linked to their parent country. 
• User Management: View all registered users, suspend or deactivate accounts, and reset 
passwords on behalf of users. 
• Business Listing Management: Review submitted business profiles, approve or reject 
listings, and manage active or suspended listings. 
• Subscription Package Management: Create, edit, and deactivate subscription plans with 
configurable pricing and duration. 
• Payment Monitoring: View all payment transactions, subscription statuses, and revenue 
metrics by country. 
• Notification Broadcasting: Send system-wide or country-specific announcements to all 
users via email. 
• Analytics Dashboard: Access high-level metrics including active businesses per country, 
subscription conversion rates, and payment volumes. 
• System Logs: View activity logs for auditing, debugging, and compliance purposes. 
3.2 Module 2 — Multi-Country and Multi-City Support 
The platform is built to support an unlimited number of countries and cities without any architectural 
changes. Adding a new country requires only a database entry and a DNS record — no new server 
or codebase is needed. 
• Unlimited countries can be registered and activated by the admin. 
• Each country supports unlimited cities. 
• Country context is automatically inferred from the subdomain on every API request. 
• All database queries are automatically scoped to the active country, preventing data bleed 
between regions. 
3.3 Module 3 — Business Registration and Profile Management 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Business owners can register on the platform, create detailed business profiles, and manage all 
aspects of their digital presence. A single user account may manage multiple businesses across 
different cities. 
• Business Details: Business name, description, industry category, phone number, email 
address, website URL, and physical address. 
• Products and Services: Business owners can add, edit, and remove individual products or 
services with descriptions, pricing, and images. 
• Branch Management: A business can register multiple physical branches, each with its 
own city, address, phone, and operating hours. 
• Media Uploads: Owners can upload a logo, multiple gallery images, video links or video 
files, and a business card in image or PDF format. 
• Business Card: A dedicated business card asset (image or PDF) can be uploaded per 
business for brand identity display. 
• Profile Editing: All profile fields, media, and branch information can be updated at any time 
from the owner dashboard. 
• Listing Visibility: A listing becomes publicly visible only after admin approval and an active 
subscription. Expired subscriptions automatically deactivate the listing. 
3.4 Module 4 — Subscription and Payment System 
All business listings are gated behind a subscription plan. The payment infrastructure is built on 
Stripe, ensuring secure, PCI-compliant transactions globally. 
• Monthly Plan: Business owners pay a monthly fee to maintain an active listing. 
Auto-renewal is supported. 
• Yearly Plan: A discounted annual subscription is available. Auto-renewal is supported. 
• Secure Checkout: Payment is processed through the Stripe-hosted checkout flow with full 
SSL encryption. 
• Webhook Integration: Stripe sends real-time event notifications to the backend on payment 
success, failure, and subscription renewals. The backend updates subscription statuses 
automatically. 
• Invoice Generation: A payment receipt and invoice are automatically generated and 
emailed to the business owner after every successful transaction. 
• Subscription Expiry Logic: The system checks subscription end dates daily. Listings with 
expired subscriptions are automatically deactivated and the owner is notified. 
3.5 Module 5 — Notification System 
The notification system is built on NodeMailer and handles all transactional communication between 
the platform and its users. Notifications are triggered automatically by system events and can also 
be sent manually by the admin. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Notification Event Recipient Trigger 
Account Registration Business Owner On successful email verification 
Listing Submitted Admin When a business submits for approval 
Listing Approved Business Owner When admin approves the listing 
Listing Rejected Business Owner When admin rejects the listing with 
reason 
Payment Confirmed Business Owner On successful Stripe payment 
Payment Failed Business Owner On failed or declined payment 
Subscription Expiry (7d) Business Owner Seven days before subscription ends 
Subscription Expiry (1d) Business Owner One day before subscription ends 
Subscription Expired Business Owner On day of expiry 
Password Reset Business Owner On password reset request 
Admin Broadcast All / Country On manual admin send 
 
3.6 Module 6 — Role-Based Access Control (RBAC) 
The system enforces strict role-based access control across all routes and actions. Each role has a 
clearly defined set of permissions that cannot be escalated by the user. 
 
Role Access Level Key Permissions 
Super Admin Full System All CRUD operations, payments, users, 
countries, analytics, notifications 
Business Owner Own Business Only Create and manage own business, upload 
media, manage subscription, view invoices 
Public User Read-Only Browse businesses, search and filter, view 
profiles — no account required 
 
3.7 Module 7 — Search and Filtering 
The public directory interface provides a comprehensive search and filter system that allows visitors 
to quickly find relevant businesses within their country. 
 
• Country Filter: Automatically applied based on the active subdomain. Cannot be overridden 
by the public user. 
• City Filter: Dropdown selection of all cities within the active country. 
• Category Filter: Filter businesses by their assigned industry or service category. 
• Keyword Search: Full-text search across business name, description, and service listings. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
• Product or Service Type: Filter by specific product or service tags associated with 
business listings. 
3.8 Module 8 — Business Branch Management 
To accommodate businesses with multiple physical locations, the platform supports branch creation 
as a first-class feature within each business profile. 
• Each business can have one or more branches in addition to the primary address. 
• Each branch stores its own city, street address, phone number, and operating hours. 
• Branches are displayed on the public business profile as expandable location entries. 
• Branches are managed entirely from the business owner's dashboard. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
4. User Journeys 
This section describes the complete end-to-end experience for each user role within the system. 
These journeys reflect the full operational flow from onboarding through active usage. 
4.1 Public User Journey 
A public visitor arrives on a country-specific subdomain and can immediately browse, search, and 
explore business listings without needing an account. 
Step 1  Visit Subdomain — User navigates to a country URL such as uk.digitaldirectory.com. 
The backend detects the subdomain and scopes all data to the United Kingdom. 
Step 2  Browse Listings — The homepage displays approved, active business listings from the 
active country, organized by category or recent activity. 
Step 3  Search and Filter — The visitor uses keyword search, city dropdown, and category 
filter to narrow results to their needs. 
Step 4  View Business Profile — Clicking a listing opens the full business profile with 
description, media gallery, services, branches, and contact information. 
Step 5  Contact Business — The visitor uses the displayed phone number, email, or website 
link to contact the business directly. No account is required. 
4.2 Business Owner Journey — Registration and Onboarding 
A new business owner registers on the platform, builds their business profile, selects a subscription, 
and awaits admin approval before going live. 
Step 1  Registration — Owner visits the platform and submits name, email, and password. A 
verification email is sent. 
Step 2  Email Verification — Owner clicks the link in the verification email to activate their 
account. 
Step 3  Login — Owner logs in with their verified credentials. A JWT token is issued. 
Step 4  Create Business — Owner fills in business name, description, category, city, phone, 
email, website, and address. 
Step 5  Upload Media — Owner uploads logo, gallery images, video link or file, and a business 
card image or PDF. 
Step 6  Add Products/Services — Owner lists the products or services offered, with 
descriptions and optional pricing. 
Step 7  Add Branches — Owner adds one or more branch locations with individual city, 
address, and contact details. 
Step 8  Select Subscription — Owner chooses either the monthly or yearly subscription plan. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Step 9  Stripe Payment — Owner completes payment on the secure Stripe checkout. A 
payment confirmation email is sent. 
Step 10  Admin Review — The submitted listing enters the admin review queue. The admin 
approves or rejects with feedback. 
Step 11  Business Published — On approval, the listing becomes publicly visible on the 
correct country subdomain. 
4.3 Business Owner Journey — Subscription Renewal 
When an active subscription approaches expiry, the system guides the owner through a seamless 
renewal process. 
Step 1  Expiry Reminder — The system automatically sends reminder emails 7 days and 1 day 
before the subscription end date. 
Step 2  Login to Dashboard — Owner logs in and sees a renewal prompt on their dashboard. 
Step 3  Select Plan — Owner selects the same or a different subscription plan for renewal. 
Step 4  Complete Payment — Owner completes the Stripe payment. The webhook confirms 
the transaction to the backend. 
Step 5  Subscription Updated — The subscription end date is extended and the listing 
remains active without interruption. 
4.4 Admin Journey — Daily Operations 
The admin manages all platform activity through a centralized dashboard covering listings, 
payments, geography, and communications. 
Step 1  Admin Login — Admin authenticates with elevated credentials. A JWT token with 
admin role is issued. 
Step 2  Dashboard Overview — Admin sees a summary of pending approvals, active 
businesses, recent payments, and system alerts. 
Step 3  Manage Geography — Admin adds or updates countries and cities as the platform 
expands to new regions. 
Step 4  Review Submissions — Admin opens the listing approval queue, reviews each 
business profile, and approves or rejects with optional reason. 
Step 5  Monitor Payments — Admin views all transactions, filters by country or date range, 
and checks subscription statuses. 
Step 6  Send Notifications — Admin composes and dispatches broadcast emails to all users 
or users within a specific country. 
Step 7  View Reports — Admin accesses analytics showing business counts, subscription 
rates, and revenue by country. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
5. Subdomain-Based Country Architecture 
The subdomain routing mechanism is the architectural cornerstone of the entire platform. It enables 
a single backend and database to serve multiple countries intelligently without any duplication of 
infrastructure. 
5.1 DNS Configuration 
Versel manages the DNS for the root domain digitaldirectory.com. A wildcard DNS record is 
configured to point all subdomains to the same server IP address. This means whether a user visits 
uk.digitaldirectory.com or korea.digitaldirectory.com, the request arrives at the same backend 
server. SSL certificates are also issued automatically by Versel for all subdomains under the 
wildcard. 
5.2 Backend Country Resolution Logic 
When the backend receives an incoming request, it follows a deterministic five-step process to 
resolve the country context. This logic is applied as middleware on every API request, ensuring all 
downstream queries are automatically scoped to the correct country. 
Step 1  Read Host Header — The backend reads the incoming HTTP request's host header 
value. 
Step 2  Extract Subdomain — The subdomain prefix is extracted from the host. For 
uk.digitaldirectory.com, the extracted value is 'uk'. 
Step 3  Validate Against Database — The extracted subdomain is matched against the 
countries table. If no match is found, a 404 response is returned. 
Step 4  Attach Country Context — The resolved country record, including its ID and country 
code, is attached to the request object for use by all subsequent route handlers. 
Step 5  Scope All Queries — Every database query within the request lifecycle automatically 
includes a filter on country_id, ensuring only data belonging to the resolved country is returned. 
5.3 Benefits of This Architecture 
• No separate backend is needed per country — a single deployment serves all regions. 
• Expanding to a new country requires only a new database record and a DNS entry. 
• All security, validation, and business logic is maintained in a single codebase. 
• Data isolation between countries is enforced at the query level — not at the infrastructure 
level. 
• The architecture supports horizontal scaling since the backend is entirely stateless. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
6. Functional Requirements 
This section defines all functional capabilities the system must fulfill. Each requirement is presented 
in terms of what the system does in response to user or administrative actions. 
6.1 User Management 
• The system must allow new users to register with a name, email address, and password. 
• The system must send an email verification link upon registration and disallow login until the 
email is verified. 
• The system must authenticate users using JWT-based stateless sessions with configurable 
expiry. 
• The system must allow users to request a password reset via a time-limited email link. 
• The system must allow users to update their profile information from their dashboard. 
• The admin must be able to suspend, deactivate, or permanently delete any user account. 
6.2 Business Management 
• The system must allow an authenticated business owner to create one or more business 
listings. 
• Each business must be associated with a country, city, and category at creation time. 
• The system must allow owners to add, edit, and remove products or services linked to their 
business. 
• The system must allow owners to create and manage branch locations, each with its own 
address and contact details. 
• The system must allow owners to upload a logo, up to a configurable number of gallery 
images, one business card asset, and a video link or file. 
• The system must enforce that a business listing is only publicly visible if it has an active 
subscription and has been approved by the admin. 
• The system must allow owners to deactivate their own listing at any time. 
6.3 Admin Controls 
• The admin must be able to create, update, and deactivate country records including 
subdomain and country code. 
• The admin must be able to create, update, and remove city records linked to a country. 
• The admin must be able to create and manage industry categories shared across all 
countries. 
• The admin must be able to approve or reject any business listing submission, with an 
optional rejection reason communicated to the owner. 
• The admin must be able to suspend or reinstate any user account. 
• The admin must be able to create, edit, and deactivate subscription plans with custom 
pricing and duration. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
• The admin must be able to view full system logs including user actions, payment events, 
and listing changes. 
• The admin must be able to send email notifications to all users, users within a specific 
country, or individual accounts. 
6.4 Subscription and Payment 
• The system must integrate with Stripe to process monthly and yearly subscription payments. 
• The system must listen to Stripe webhook events and update subscription statuses in real 
time on payment success or failure. 
• The system must generate and email an invoice to the business owner on every successful 
payment. 
• The system must automatically check subscription expiry dates and deactivate expired 
listings. 
• The system must send reminder emails 7 days and 1 day before a subscription expires. 
• The system must support auto-renewal when enabled by the business owner via Stripe 
recurring billing. 
6.5 Notifications 
• All notification emails must be sent via NodeMailer with HTML templates. 
• Email triggers must include: registration, approval, rejection, payment confirmation, payment 
failure, subscription expiry (7 days), subscription expiry (1 day), subscription expired, and 
password reset. 
• The admin broadcast function must support sending emails to all users globally or filtered by 
country. 
• Failed email deliveries must be logged for admin review and retry. 
6.6 Search and Discovery 
• The system must automatically apply country context to all search results based on the 
active subdomain. 
• The system must support filtering by city within the active country. 
• The system must support filtering by business category. 
• The system must support full-text keyword search across business name, description, and 
associated services. 
• The system must return only approved, active-subscription businesses in all public search 
results. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
7. Non-Functional Requirements 
7.1 Performance 
• All public-facing pages and API responses must load within three seconds under normal 
traffic conditions. 
• Database queries must be indexed on all foreign keys and commonly filtered fields including 
country_id, city_id, category_id, is_approved, and subscription status. 
• Media assets must be served through Cloudflare R2 with CDN caching to minimize latency 
across geographies. 
• The backend must be capable of handling at least 500 concurrent users per country 
subdomain without degradation. 
7.2 Security 
• All traffic must be served over HTTPS with SSL certificates managed by Cloudflare. 
• All user passwords must be hashed using bcrypt with a minimum of 12 salt rounds before 
storage. 
• JWT tokens must include role claims and have a defined expiry. Refresh tokens must be 
supported. 
• All API endpoints must enforce role-based authorization, rejecting requests where the 
caller's role does not permit the action. 
• All user inputs must be validated and sanitized server-side to prevent SQL injection, XSS, 
and other injection attacks. 
• API rate limiting must be enforced on authentication endpoints and public search routes to 
prevent abuse. 
• Stripe webhook payloads must be verified using Stripe's signing secret before processing. 
7.3 Scalability 
• The backend must be stateless so that additional server instances can be added horizontally 
without session conflict. 
• Media storage must be offloaded entirely to Cloudflare R2, removing local disk dependency 
and enabling unlimited media scale. 
• Database design must support adding new countries without schema changes — only new 
row insertions. 
• The platform must support containerized deployment to facilitate auto-scaling in cloud 
environments. 
7.4 Availability and Reliability 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
• The platform must target 99% uptime availability on an annual basis. 
• Automated database backups must run daily with a minimum 30-day retention policy. 
• Critical background jobs including subscription expiry checks and webhook processing must 
include retry logic for failure recovery. 
• System health checks and uptime monitoring must be configured and alert the admin team 
on downtime. 
7.5 Maintainability 
• The backend codebase must follow RESTful API design conventions with clear endpoint 
naming. 
• All environment-sensitive configuration including API keys, database credentials, and Stripe 
secrets must be stored in environment variables, never in code. 
• Database migrations must be version-controlled using a migration tool to allow safe schema 
evolution. 
• System activity logs must be retained for a minimum of 90 days and be accessible to the 
admin panel. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
8. Database Design 
The database is designed to be normalized, non-redundant, and optimized for the country-scoped 
query patterns of the platform. Every table follows clear relational integrity rules, and indexes are 
placed on all fields used in filtering, joining, and lookup operations. The design supports unlimited 
growth across countries, cities, businesses, and subscriptions without structural changes. 
 
8.1 users 
Stores all registered user accounts regardless of role. The role field distinguishes between super 
admins and business owners. 
 
Column Type Constraints Description 
id UUID Primary Key Globally unique user 
identifier 
name VARCHAR(150) NOT NULL Full display name of the user 
email VARCHAR(255) UNIQUE, NOT NULL Login email address 
password_hash TEXT NOT NULL bcrypt-hashed password 
role ENUM NOT NULL, DEFAULT 
'owner' 
Values: super_admin, owner 
is_verified BOOLEAN DEFAULT false Email verification flag 
is_active BOOLEAN DEFAULT true Admin suspension flag 
created_at TIMESTAMP DEFAULT NOW() Account creation timestamp 
updated_at TIMESTAMP Auto-updated Last profile update 
timestamp 
 
8.2 countries 
Defines each supported country. The subdomain field is used to match incoming request host 
headers. 
 
Column Type Constraints Description 
id UUID Primary Key Unique country identifier 
name VARCHAR(100) NOT NULL Country display name 
country_code VARCHAR(10) UNIQUE, NOT NULL ISO code, e.g. UK, KR, PK 
subdomain VARCHAR(50) UNIQUE, NOT NULL Subdomain prefix, e.g. 'uk', 
'korea' 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Column Type Constraints Description 
is_active BOOLEAN DEFAULT true Controls whether the country 
subdomain is live 
 
8.3 cities 
Stores cities linked to their parent country. Used for listing assignment and search filtering. 
 
Column Type Constraints Description 
id UUID Primary Key Unique city identifier 
name VARCHAR(100) NOT NULL City display name 
country_id UUID Foreign Key → 
countries 
Parent country reference 
is_active BOOLEAN DEFAULT true Visibility flag 
 
8.4 categories 
Shared taxonomy of business categories, used for filtering and organizing listings across all 
countries. 
 
Column Type Constraints Description 
id UUID Primary Key Unique category identifier 
name VARCHAR(100) UNIQUE, NOT NULL Category label, e.g. 
Restaurants, Legal, 
Healthcare 
is_active BOOLEAN DEFAULT true Soft-delete flag 
 
8.5 businesses 
The central entity of the platform. Each business belongs to a user, a country, a city, and a category. 
Approval and subscription status control public visibility. 
 
Column Type Constraints Description 
id UUID Primary Key Unique business identifier 
user_id UUID Foreign Key → users Owner of the business 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Column Type Constraints Description 
country_id UUID Foreign Key → 
countries 
Country the listing belongs to 
city_id UUID Foreign Key → cities Primary city of the business 
category_id UUID Foreign Key → 
categories 
Industry category 
name VARCHAR(20
0) 
NOT NULL Business display name 
description TEXT NULLABLE Full business description 
phone VARCHAR(30) NULLABLE Primary contact phone 
email VARCHAR(25
5) 
NULLABLE Business contact email 
website VARCHAR(30
0) 
NULLABLE Business website URL 
address TEXT NULLABLE Primary physical address 
logo_url TEXT NULLABLE Cloudflare R2 URL for logo 
is_approved BOOLEAN DEFAULT false Admin approval flag 
is_active BOOLEAN DEFAULT true Owner-controlled visibility flag 
created_at TIMESTAMP DEFAULT NOW() Submission timestamp 
updated_at TIMESTAMP Auto-updated Last edit timestamp 
 
8.6 business_branches 
Stores additional physical locations for a business. Each branch is tied to a city within the same 
country as the parent business. 
 
Column Type Constraints Description 
id UUID Primary Key Unique branch identifier 
business_id UUID Foreign Key → 
businesses 
Parent business 
city_id UUID Foreign Key → cities City of this branch 
address TEXT NOT NULL Branch street address 
phone VARCHAR(30) NULLABLE Branch contact phone 
operating_hours TEXT NULLABLE Open hours as text or JSON 
created_at TIMESTAMP DEFAULT NOW() Branch creation timestamp 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
 
8.7 business_services 
Stores individual products or services offered by a business. Supports detailed listing enrichment 
and service-type filtering. 
 
Column Type Constraints Description 
id UUID Primary Key Unique service identifier 
business_id UUID Foreign Key → 
businesses 
Parent business 
title VARCHAR(20
0) 
NOT NULL Product or service name 
description TEXT NULLABLE Detailed description 
price DECIMAL(10,
2) 
NULLABLE Optional display price 
image_url TEXT NULLABLE Associated image on 
Cloudflare R2 
created_at TIMESTAMP DEFAULT NOW() Creation timestamp 
 
8.8 business_media 
Stores all gallery images and video assets for a business. The media_type field distinguishes 
between image and video entries. 
 
Column Type Constraints Description 
id UUID Primary Key Unique media item identifier 
business_id UUID Foreign Key → 
businesses 
Parent business 
media_type ENUM NOT NULL Values: image, video 
media_url TEXT NOT NULL Cloudflare R2 URL or external 
video URL 
sort_order INT DEFAULT 0 Display order for gallery 
created_at TIMESTAMP DEFAULT NOW() Upload timestamp 
 
8.9 business_cards 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Stores the business card asset for each business. A business can have one active business card, 
either as an image or a PDF file. 
 
Column Type Constraints Description 
id UUID Primary Key Unique card identifier 
business_id UUID UNIQUE, FK → 
businesses 
Parent business — one card 
per business 
card_url TEXT NOT NULL Cloudflare R2 URL for the card 
file 
file_type ENUM NOT NULL Values: image, pdf 
created_at TIMESTAMP DEFAULT NOW() Upload timestamp 
 
8.10 subscription_plans 
Defines the available subscription tiers. Plans are managed by the admin and can be updated or 
retired without deleting existing subscriber records. 
 
Column Type Constraints Description 
id UUID Primary Key Unique plan identifier 
name VARCHAR(10
0) 
NOT NULL Plan label, e.g. Monthly, Yearly 
price DECIMAL(10,
2) 
NOT NULL Billing amount in base currency 
duration_in_days INT NOT NULL Subscription length in days 
is_active BOOLEAN DEFAULT true Controls whether this plan is 
available for purchase 
stripe_price_id VARCHAR(10
0) 
NULLABLE Stripe Price ID for recurring 
billing 
 
8.11 subscriptions 
Tracks the subscription status of each business. A business can only have one active subscription 
at a time. Historical records are retained for audit. 
 
Column Type Constraints Description 
id UUID Primary Key Unique subscription record 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Column Type Constraints Description 
business_id UUID Foreign Key → 
businesses 
Subscribed business 
plan_id UUID Foreign Key → 
subscription_plans 
Plan at time of purchase 
stripe_subscription_id VARCHAR(
100) 
NULLABLE Stripe subscription object ID 
start_date DATE NOT NULL Subscription start date 
end_date DATE NOT NULL Subscription expiry date 
status ENUM NOT NULL Values: active, expired, 
cancelled, pending 
auto_renew BOOLEAN DEFAULT false Auto-renewal flag 
created_at TIMESTAM
P 
DEFAULT NOW() Record creation timestamp 
 
8.12 payments 
Records every payment transaction linked to a subscription. Provides a complete financial audit 
trail. 
 
Column Type Constraints Description 
id UUID Primary Key Unique payment record 
subscription_id UUID Foreign Key → 
subscriptions 
Linked subscription 
stripe_payment_intent VARCHAR(
100) 
UNIQUE, NOT NULL Stripe PaymentIntent ID 
amount DECIMAL(1
0,2) 
NOT NULL Amount charged in base 
currency 
currency VARCHAR(
10) 
NOT NULL, 
DEFAULT 'usd' 
ISO currency code 
status ENUM NOT NULL Values: success, failed, 
refunded 
created_at TIMESTAM
P 
DEFAULT NOW() Payment event timestamp 
 
8.13 notifications_log 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Records all outbound notifications for auditing and retry management. This table enables the admin 
to monitor delivery failures and track communication history. 
Column 
Type 
Constraints 
id 
user_id 
UUID 
UUID 
Primary Key 
Description 
Unique notification record 
FK → users 
Recipient user 
type 
channel 
VARCHAR(50) NOT NULL 
ENUM 
Notification type, e.g. approval, 
payment, expiry 
NOT NULL 
status 
sent_at 
ENUM 
TIMESTAMP 
NOT NULL 
Values: email (sms in future) 
Values: sent, failed, pending 
NULLABLE 
created_at 
TIMESTAMP 
DEFAULT NOW() 
8.14 Entity Relationship Summary 
Delivery timestamp 
Record creation timestamp 
The following describes the primary relationships between all tables in plain terms. 
• users to businesses: One user can own many businesses (one-to-many). 
• businesses to countries: Each business belongs to exactly one country (many-to-one). 
• businesses to cities: Each business belongs to exactly one primary city (many-to-one). 
• businesses to categories: Each business belongs to exactly one category (many-to-one). 
• businesses to business_branches: One business can have many branches 
(one-to-many). 
• businesses to business_services: One business can have many services or products 
(one-to-many). 
• businesses to business_media: One business can have many media items 
(one-to-many). 
• businesses to business_cards: One business has at most one business card 
(one-to-one). 
• businesses to subscriptions: One business can have many subscription records over time 
(one-to-many), with one active at any time. 
• subscriptions to payments: One subscription can have many payment records 
(one-to-many). 
• cities to countries: Each city belongs to exactly one country (many-to-one). 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
9. Technology Stack 
The following technology choices have been made to ensure performance, scalability, security, and 
long-term maintainability of the Digital Directory platform. 
 
Layer Technology Rationale 
Backend Runtime Node.js High-performance, event-driven, ideal for 
I/O-heavy API workloads 
Web Framework Express.js Minimal, flexible, widely supported REST API 
framework 
Database PostgreSQL Relational integrity, strong indexing, JSON 
support, and proven scalability 
Authentication JWT Stateless tokens enable horizontal scaling 
without shared session state 
Media Storage Cloudflare R2 S3-compatible object storage with zero egress 
fees and global CDN integration 
DNS and SSL versel Wildcard DNS, automatic SSL for all 
subdomains, DDoS protection 
Payment Gateway Stripe Global reach, subscription billing, webhooks, PCI 
compliance built-in 
Email Notifications NodeMailer Flexible SMTP integration for transactional 
emails with HTML templates 
Password Security bcrypt Industry-standard adaptive hashing for password 
storage 
Environment Config dotenv Secure management of environment variables 
outside the codebase 
 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
10. Complete System Workflow 
This section describes the end-to-end data flow from a business owner's initial registration to their 
listing appearing live on the correct country subdomain. 
10.1 Business Owner Onboarding Flow 
Step 1  Registration — Owner submits registration form. System creates an unverified user 
record and sends a verification email. 
Step 2  Email Verification — Owner clicks the time-limited verification link. Account is marked 
as verified and login is permitted. 
Step 3  Authentication — Owner logs in. System validates credentials, issues a signed JWT, 
and returns the token to the client. 
Step 4  Business Profile — Owner submits business details. System creates a business 
record linked to user, country, city, and category with is_approved set to false. 
Step 5  Media Upload — Owner uploads logo, images, video, and business card. Files are 
stored on Cloudflare R2 and URLs are saved in the relevant media tables. 
Step 6  Services and Branches — Owner adds service listings and branch locations. Records 
are written to business_services and business_branches. 
Step 7  Subscription Selection — Owner selects a plan. System initiates a Stripe Checkout 
session with the corresponding price ID. 
Step 8  Payment Completion — Owner completes payment on Stripe's hosted page. Stripe 
fires a webhook event to the backend. 
Step 9  Webhook Processing — Backend receives the Stripe webhook, verifies the signature, 
creates a subscriptions record with status 'active', and logs the payment in the payments table. 
Step 10  Admin Notification — System sends an email to the admin notifying them of a new 
listing pending review. 
Step 11  Admin Approval — Admin reviews the listing and approves it. System sets 
is_approved to true and sends the owner an approval confirmation email. 
Step 12  Listing Published — Business is now publicly visible on the correct country 
subdomain with active status and full profile. 
10.2 Public Directory Access Flow 
Step 1  Subdomain Visit — Visitor navigates to a country URL such as 
korea.digitaldirectory.com. 
Step 2  Country Resolution — Backend middleware extracts 'korea' from the host header, 
validates it against the countries table, and attaches country_id to the request context. 
Step 3  Data Filtering — All queries for this request are scoped to the resolved country_id, 
returning only Korean businesses. 
Step 4  Search Results — System returns approved, active-subscription businesses matching 
any applied search or filter parameters. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
Step 5  Profile View — Visitor views a full business profile including media, services, branches, 
and contact details. 
10.3 Subscription Expiry and Renewal Flow 
Step 1  Daily Expiry Check — A scheduled background job runs each day and identifies 
subscriptions expiring within 7 days and within 1 day. 
Step 2  Reminder Emails — NodeMailer sends automated reminder emails to affected 
business owners at both checkpoints. 
Step 3  Expiry Action — On the expiry date, the subscription status is set to 'expired' and the 
business listing is automatically deactivated. 
Step 4  Owner Renewal — Owner logs in, sees the renewal prompt, selects a plan, and 
completes the Stripe payment. 
Step 5  Webhook Confirmation — Stripe webhook confirms the renewal payment. Backend 
creates a new subscriptions record, reactivates the listing, and sends a confirmation email. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
11. Future Enhancements 
The following features are planned for future development phases. They have been excluded from 
the current scope to maintain focus and delivery timeline but are architected for in the current 
database and system design. 
• Reviews and Ratings: Public users can leave star ratings and written reviews on business 
profiles. A reviews table will extend the existing businesses entity. 
• Country-Level Admin Roles: A dedicated Country Admin role that has management rights 
limited to their assigned country, without access to global settings. 
• Mobile Applications: Native iOS and Android apps built on the same backend API, 
extending the platform to mobile users. 
• Business Owner Analytics Dashboard: A self-service analytics view for business owners 
showing profile views, search appearances, and click-through rates. 
• SMS Notifications: An additional notification channel alongside email, using an SMS 
gateway for subscription alerts and critical updates. 
• Multi-Language Support: Interface and content localization supporting multiple languages 
per country subdomain. 
• Featured Listings and Promotions: Premium placement options where businesses can 
pay to appear at the top of search results within their category or city. 
• Business Verification Badges: An optional verification process where the platform 
validates the legitimacy of a business and displays a verified badge on the profile. 
Confidential  —  Labverse.org  —  Page  
Digital Directory System   |   Software Requirements Specification v2.0 
12. Conclusion 
The Digital Directory platform is a carefully architected, centralized, and scalable multi-country 
business directory system. By leveraging a single backend instance with intelligent 
subdomain-based country routing, the platform achieves the rare combination of geographic 
flexibility and operational simplicity. 
The database design is normalized and non-redundant, built to grow to any number of countries, 
cities, businesses, and subscribers without structural changes. The subscription system backed by 
Stripe ensures reliable revenue flow, while the notification layer and admin controls provide full 
operational visibility and management capability. 
This SRS document represents the complete specification for the platform, covering all functional 
requirements, non-functional requirements, user journeys, database schema, and architectural 
decisions. It is intended to serve as the definitive reference for development, review, and client 
communication throughout the project lifecycle. 
Prepared For 
Abid Siddique Chaudhry 
Developed By 
Muhammad Husnain Ramzan  —  
Labverse.org(Junaid Aslam) 
Confidential  —  Labverse.org  —  Page  