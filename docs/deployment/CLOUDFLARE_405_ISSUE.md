# Cloudflare 405 Method Not Allowed Issue

## Problem
All POST requests to `racedayai.com` API endpoints are returning 405 Method Not Allowed errors.

## Root Cause
The domain `racedayai.com` is proxied through Cloudflare (orange cloud enabled), and Cloudflare has a security rule or WAF configuration that is blocking all POST requests.

## Evidence
1. **GET requests work fine:**
   ```bash
   curl -X GET "https://racedayai.com/api/races/search?q=ironman&limit=1"
   # Returns: HTTP/2 200 OK ✅
   ```

2. **POST requests are blocked:**
   ```bash
   curl -X POST "https://racedayai.com/api/plans/generate" \
     -H "Content-Type: application/json" -d '{}'
   # Returns: HTTP/2 405 Method Not Allowed ❌
   ```

3. **Direct Vercel URL works (returns 401 auth required, not 405):**
   ```bash
   curl -X POST "https://racedayai-8q2lblocf-mykytars-projects.vercel.app/api/plans/generate" \
     -H "Content-Type: application/json" -d '{}'
   # Returns: HTTP/2 401 (Authentication Required) ✅
   # This proves the Next.js route is working correctly!
   ```

4. **Cloudflare headers present:**
   - `server: cloudflare`
   - `cf-cache-status: DYNAMIC`
   - `cf-ray: 9cd6a850282ab610-WAW`

## Solution

### Option 1: Fix Cloudflare Security Rules (Recommended)
1. Log in to Cloudflare dashboard at https://dash.cloudflare.com
2. Select the `racedayai.com` domain
3. Go to **Security** → **WAF** (Web Application Firewall)
4. Check for rules that might be blocking POST requests
5. Go to **Security** → **Settings**
6. Review **Security Level** (try setting to "Medium" or "Low" temporarily)
7. Check **Bot Fight Mode** - if enabled, it might be blocking legitimate POST requests
8. Create an exception rule for `/api/*` paths to allow POST methods

### Option 2: Bypass Cloudflare (Temporary)
1. Go to Cloudflare dashboard → DNS settings for `racedayai.com`
2. Click on the orange cloud icon next to the A/CNAME record
3. Change it to gray cloud (DNS only mode)
4. Wait for DNS propagation (~5 minutes)
5. Test POST requests again

### Option 3: Use Page Rules
1. Go to **Rules** → **Page Rules** in Cloudflare
2. Create a new page rule for `racedayai.com/api/*`
3. Add setting: **Security Level** → **Off** or **Low**
4. Save and test

## Verification
After applying the fix, test with:
```bash
curl -X POST "https://racedayai.com/api/plans/generate" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie-here" \
  -d '{"fitnessData":{}, "raceData":{}}' \
  -i
```

Expected response: HTTP 401 (auth error) or 400 (validation error), NOT 405!
