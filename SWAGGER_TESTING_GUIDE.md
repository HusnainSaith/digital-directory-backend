# 📋 Swagger Testing Guide - Business Module Routes

## 🌐 **Access Swagger UI**
**URL:** http://localhost:3000/api/docs

---

## 🔐 **Step 1: Authentication**

### Login to get JWT Token
1. Expand **Auth** section
2. Click **POST /auth/login**
3. Click **"Try it out"**
4. Use these credentials:
   ```json
   {
     "email": "ramzanhusnain7194@gmail.com",
     "password": "superadmin123"
   }
   ```
5. Click **"Execute"**
6. Copy the `accessToken` from the response
7. Click **"Authorize"** button (🔒 icon at top)
8. Paste token in format: `Bearer YOUR_TOKEN_HERE` (or just the token)
9. Click **"Authorize"** then **"Close"**

---

## 📁 **Step 2: Test Categories Module**

### ✅ **Create Category**
- **Endpoint:** POST /categories
- **Request Body:**
  ```json
  {
    "name": "Automotive",
    "slug": "automotive",
    "icon": "car",
    "description": "Automotive and vehicle related businesses"
  }
  ```
- **Expected:** 201 Created
- **Note:** Save the returned `id` for next steps

### ✅ **Upload Category Icon** (R2 Upload Test)
- **Endpoint:** POST /categories/{id}/icon
- **Parameters:**
  - `id`: Use category ID from previous step
  - `file`: Click "Choose File" and select an image (JPEG, PNG, WebP, or SVG)
- **Expected:** 200 OK with R2 URL in `icon` field
- **Verify:** Check that `icon` contains R2 URL: `https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/...`

### ✅ **Get All Categories**
- **Endpoint:** GET /categories
- **Expected:** 200 OK with array of categories

### ✅ **Get Category by ID**
- **Endpoint:** GET /categories/{id}
- **Parameters:**
  - `id`: Category ID
- **Expected:** 200 OK with category details including icon URL

### ✅ **Update Category**
- **Endpoint:** PATCH /categories/{id}
- **Request Body:**
  ```json
  {
    "description": "Updated description for automotive category"
  }
  ```
- **Expected:** 200 OK

### ✅ **Upload New Icon** (R2 Update Test)
- **Endpoint:** POST /categories/{id}/icon
- **Action:** Upload a different image
- **Expected:** Old icon deleted from R2, new icon uploaded
- **Verify:** New R2 URL in response

---

## 🌆 **Step 3: Test Cities Module**

### ✅ **Create Country First** (Required for City)
- **Endpoint:** POST /countries
- **Request Body:**
  ```json
  {
    "name": "United States",
    "code": "US",
    "flag": "🇺🇸",
    "subdomain": "us"
  }
  ```
- **Note:** Save the returned `id`

### ✅ **Create City**
- **Endpoint:** POST /cities
- **Request Body:**
  ```json
  {
    "name": "New York",
    "slug": "new-york",
    "region": "New York State",
    "heroImage": "/images/cities/default.jpg",
    "description": "The Big Apple - Business hub of America",
    "countryId": "PASTE_COUNTRY_ID_HERE"
  }
  ```
- **Note:** Save the returned city `id`

### ✅ **Upload City Hero Image** (R2 Upload Test)
- **Endpoint:** POST /cities/{id}/hero-image
- **Parameters:**
  - `id`: City ID
  - `file`: Upload large hero image (JPEG, PNG, WebP - up to 10MB)
- **Expected:** 200 OK with R2 URL in `heroImage` field

### ✅ **Get All Cities**
- **Endpoint:** GET /cities
- **Query Parameters:**
  - `countryId`: Filter by country (optional)
  - `page`: 1
  - `limit`: 20
- **Expected:** 200 OK with cities array

### ✅ **Update City Hero Image** (R2 Update Test)
- **Endpoint:** POST /cities/{id}/hero-image
- **Action:** Upload different hero image
- **Expected:** Old hero image deleted from R2, new one uploaded

---

## 🏢 **Step 4: Test Businesses Module**

### ✅ **Create Business**
- **Endpoint:** POST /businesses
- **Request Body:**
  ```json
  {
    "slug": "test-auto-shop",
    "name": "Test Auto Repair Shop",
    "shortDescription": "Professional auto repair services",
    "description": "We provide comprehensive automotive repair and maintenance services with certified technicians.",
    "logo": "/images/default-logo.png",
    "businessCard": "/images/default-card.png",
    "email": "contact@autoshop.com",
    "phone": "+1-555-0123",
    "website": "https://autoshop.com",
    "address": {
      "countryId": "PASTE_COUNTRY_ID",
      "cityId": "PASTE_CITY_ID",
      "street": "123 Main Street",
      "postalCode": "10001",
      "lat": 40.7128,
      "lng": -74.0060
    },
    "categoryIds": ["PASTE_CATEGORY_ID"]
  }
  ```
- **Note:** Save the returned business `id`

### ✅ **Upload Business Logo** (R2 Upload Test)
- **Endpoint:** POST /businesses/{id}/logo
- **Parameters:**
  - `id`: Business ID
  - `file`: Upload logo image (JPEG, PNG, WebP, SVG - max 5MB)
- **Expected:** 200 OK with R2 URL in `logo` field

### ✅ **Get All Businesses**
- **Endpoint:** GET /businesses
- **Query Parameters:**
  - `page`: 1
  - `limit`: 20
  - `category`: Category slug (optional)
  - `city`: City slug (optional)
  - `search`: Search term (optional)
- **Expected:** 200 OK with businesses array

### ✅ **Get Business by ID**
- **Endpoint:** GET /businesses/{id}
- **Expected:** 200 OK with full business details including logo R2 URL

### ✅ **Get My Businesses**
- **Endpoint:** GET /businesses/mine
- **Expected:** 200 OK with businesses owned by logged-in user

### ✅ **Update Business**
- **Endpoint:** PATCH /businesses/{id}
- **Request Body:**
  ```json
  {
    "description": "Updated description with special offers and new services"
  }
  ```
- **Expected:** 200 OK

---

## 🖼️ **Step 5: Test Business Media Module**

### ✅ **Upload Business Media** (R2 Upload Test)
- **Endpoint:** POST /businesses/{businessId}/media
- **Parameters:**
  - `businessId`: Business ID
  - `file`: Upload image/video/PDF
  - `alt`: "Gallery image 1"
  - `title`: "Main service area"
  - `mediaType`: "image" (options: image, video, document)
- **File Limits:**
  - Images: 5MB (JPEG, PNG, WebP, GIF)
  - Videos: 50MB (MP4, WebM)
  - Documents: 10MB (PDF)
- **Expected:** 201 Created with R2 URL
- **Note:** Save the media `id`

### ✅ **Get All Business Media**
- **Endpoint:** GET /businesses/{businessId}/media
- **Query Parameters:**
  - `mediaType`: Filter by type (optional)
- **Expected:** 200 OK with media array

### ✅ **Delete Business Media** (R2 Delete Test)
- **Endpoint:** DELETE /businesses/{businessId}/media/{id}
- **Expected:** 200 OK
- **Verify:** File deleted from R2 storage

---

## 💳 **Step 6: Test Business Cards Module**

### ✅ **Upload Business Card** (R2 Upload Test)
- **Endpoint:** POST /businesses/{businessId}/card
- **Parameters:**
  - `businessId`: Business ID
  - `file`: Upload card image or PDF (max 10MB)
- **Expected:** 201 Created with R2 URL
- **Note:** Only one card per business

### ✅ **Get Business Card**
- **Endpoint:** GET /businesses/{businessId}/card
- **Expected:** 200 OK with card details and R2 URL

### ✅ **Replace Business Card** (R2 Update Test)
- **Endpoint:** PUT /businesses/{businessId}/card
- **Parameters:**
  - `businessId`: Business ID
  - `file`: Upload different card
- **Expected:** 200 OK
- **Verify:** Old card deleted from R2, new card uploaded

### ✅ **Delete Business Card** (R2 Delete Test)
- **Endpoint:** DELETE /businesses/{businessId}/card
- **Expected:** 200 OK
- **Verify:** Card file deleted from R2

---

## 👤 **Step 7: Test User Avatar Upload**

### ✅ **Upload User Avatar** (R2 Upload Test)
- **Endpoint:** POST /users/me/avatar
- **Parameters:**
  - `file`: Upload avatar image (JPEG, PNG, WebP, GIF - max 5MB)
- **Expected:** 200 OK with R2 URL in `avatarUrl`

### ✅ **Get My Profile**
- **Endpoint:** GET /users/me
- **Expected:** 200 OK with avatar R2 URL

### ✅ **Update Avatar** (R2 Update Test)
- **Endpoint:** POST /users/me/avatar
- **Action:** Upload different avatar
- **Expected:** Old avatar deleted from R2, new avatar uploaded

---

## 🗑️ **Step 8: Test Delete Operations (R2 Cleanup)**

### ✅ **Delete Business** (Should delete logo from R2)
- **Endpoint:** DELETE /businesses/{id}
- **Expected:** 200 OK
- **Verify:** Business and its logo removed from R2

### ✅ **Delete City** (Should delete hero image from R2)
- **Endpoint:** DELETE /cities/{id}
- **Expected:** 200 OK
- **Verify:** City and its hero image removed from R2

### ✅ **Delete Category** (Should delete icon from R2)
- **Endpoint:** DELETE /categories/{id}
- **Expected:** 200 OK
- **Verify:** Category and its icon removed from R2

---

## ✅ **Verification Checklist**

After testing, verify these R2 functionalities:

- [ ] **Uploads work**: All file upload endpoints successfully upload to R2
- [ ] **R2 URLs returned**: All responses contain R2 public URLs
- [ ] **Updates work**: Uploading new files deletes old ones from R2
- [ ] **Deletes work**: Deleting entities removes associated files from R2
- [ ] **File validation works**: Rejected invalid file types and sizes
- [ ] **Swagger UI shows file picker**: All upload endpoints have file input in Swagger

---

## 🎯 **Expected R2 URL Pattern**

All uploaded files should have URLs like:
```
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/users/{userId}/avatar/{uuid}.jpg
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/categories/{categoryId}/icon/{uuid}.png
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/cities/{cityId}/hero/{uuid}.jpg
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/businesses/{businessId}/logo/{uuid}.png
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/businesses/{businessId}/images/{uuid}.jpg
https://pub-6dc36a6ecc6f401ca82ba7018f219494.r2.dev/businesses/{businessId}/cards/{uuid}.pdf
```

---

## 🐛 **Troubleshooting**

### Server Not Starting?
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
npm run start:dev
```

### Can't Upload Files?
- Check file size limits
- Verify file type is allowed
- Ensure you're authenticated with valid JWT token

### R2 Upload Fails?
- Check `.env` file has correct R2 credentials:
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_ENDPOINT`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

---

## 📊 **Test Results Template**

| Module | Endpoint | Upload | Update | Delete | R2 URL | Status |
|--------|----------|--------|--------|--------|---------|--------|
| Categories | POST /categories/:id/icon | ✅ | ✅ | ✅ | ✅ | PASS |
| Cities | POST /cities/:id/hero-image | ✅ | ✅ | ✅ | ✅ | PASS |
| Businesses | POST /businesses/:id/logo | ✅ | ✅ | ✅ | ✅ | PASS |
| Business Media | POST /businesses/:id/media | ✅ | N/A | ✅ | ✅ | PASS |
| Business Cards | POST /businesses/:id/card | ✅ | ✅ | ✅ | ✅ | PASS |
| Users | POST /users/me/avatar | ✅ | ✅ | N/A | ✅ | PASS |

---

## 🎉 **Success Criteria**

Your R2 integration is working correctly if:
1. ✅ All file uploads return R2 public URLs
2. ✅ Files are accessible via returned URLs
3. ✅ Uploading new files automatically deletes old ones
4. ✅ Deleting entities removes their files from R2
5. ✅ All Swagger endpoints show file upload UI
6. ✅ File validation works (type + size limits)

**Happy Testing! 🚀**
