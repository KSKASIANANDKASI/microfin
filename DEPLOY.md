# Deploying Finance Easy (microfin-lms) on AWS EC2

A setup for a **test server**, on the same EC2 instance as NoQ (`13.207.94.31`). The two apps
sit side by side:

| App | Address | Backend (private) |
|---|---|---|
| NoQ | `http://13.207.94.31` (port 80) | port 8080 |
| **Finance Easy** | **`http://13.207.94.31:8081`** | port 4000 |

What runs on the server:

- **API** (`apps/api-spring`): built on your computer into one jar (`lms-api-0.1.0.jar`, about
  85 MB, every library inside) and run with `java -jar` as a systemd service. It also serves the
  AI assistant, so the Node stub in `apps/api` is **not** deployed.
- **Web app** (`apps/web`): built on your computer and served by nginx, which also passes
  `/api` through to the API.
- **PostgreSQL:** its own `lms` database, next to NoQ's.
- **Uploads:** KYC photos are stored on disk in `/var/lib/lms/uploads`.
- **Mobile app** (`apps/mobile`): not deployed; pointed at the server for testing (step 3).

The database starts with **demo data** (one branch with lines, customers and loans) so there's
something to try.

Replace `your-key.pem` with the instance's key pair file. If NoQ isn't set up yet, steps 2a–2c
of [NoQ's DEPLOY.md](../noq/DEPLOY.md) (packages, time zone, swap) are the same here; they are
repeated below and are safe to run twice.

## 0. AWS console

1. **Security group, inbound:** add **8081** (Custom TCP) from *Anywhere* (0.0.0.0/0), next to
   NoQ's 22 and 80. Do **not** open 4000.
2. **Memory:** two Java apps and PostgreSQL need a **t3.small (2 GB) or larger**, with swap
   (step 2c).
3. **Fixed IP:** `13.207.94.31` is the instance's Elastic IP (shared with NoQ), so it doesn't
   change when the instance stops; the web build has it baked in.

## 1. On your computer: build and upload

Needs JDK 17 and Node.js 20+. Run from the `microfin-lms` folder.

```bash
# API: one jar with every library inside
cd apps/api-spring
./mvnw clean package          # runs the tests first; add -DskipTests to skip them
ls -lh target/lms-api-0.1.0.jar   # about 85 MB
cd ../..

# Web app, built to call the API through nginx on port 8081
npm install
VITE_API_URL=http://13.207.94.31:8081 npm run build:web
ls apps/web/dist/index.html

# Upload both
chmod 400 your-key.pem
scp -i your-key.pem apps/api-spring/target/lms-api-0.1.0.jar ubuntu@13.207.94.31:/tmp/lms.jar
scp -i your-key.pem -r apps/web/dist ubuntu@13.207.94.31:/tmp/lms-web
```

- `clean` empties `apps/api-spring/target`; stop a locally running API
  (`./mvnw spring-boot:run`) before building and start it again afterwards.
- The web build takes `VITE_GOOGLE_MAPS_API_KEY` from `apps/web/.env`. It ends up in the public
  JavaScript (browser keys always do), so in Google Cloud Console restrict that key to the
  referrer `http://13.207.94.31:8081/*`.

## 2. On the server

```bash
ssh -i your-key.pem ubuntu@13.207.94.31
```

### a. Packages

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless postgresql nginx
java -version          # 17
```

### b. Time zone

Due dates and the collection sheet follow the branch's calendar day.

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

### c. Swap

With NoQ on the same server, add swap even on a 2 GB instance (skip if `swapon --show`
already lists `/swapfile`):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### d. Database

```bash
openssl rand -hex 16          # note this down: DB_PASSWORD
sudo -u postgres psql -c "create role lms login password 'PASTE_DB_PASSWORD';"
sudo -u postgres psql -c "create database lms owner lms;"
```

Tables are created by Flyway when the API first starts, and the demo data right after.

### e. API file, upload folder and service user

```bash
sudo useradd --system --home /opt/lms --shell /usr/sbin/nologin lms
sudo mkdir -p /opt/lms /etc/lms /var/lib/lms/uploads
sudo mv /tmp/lms.jar /opt/lms/lms.jar
sudo chown -R lms:lms /opt/lms /var/lib/lms
```

### f. Settings

Generate the secrets:

```bash
openssl rand -base64 48       # JWT_SECRET: keeps users signed in across restarts
openssl rand -base64 32       # KYC_ENCRYPTION_KEY: encrypts customers' ID numbers
```

> **Keep a copy of `KYC_ENCRYPTION_KEY` somewhere safe, off the server** (a password manager).
> Every Aadhaar, PAN and other ID number in the database is encrypted with it. If it is lost or
> changed, those numbers can never be read again, even from a backup.

```bash
sudo nano /etc/lms/lms.env
```

```ini
DB_URL=jdbc:postgresql://localhost:5432/lms
DB_USERNAME=lms
DB_PASSWORD=PASTE_DB_PASSWORD
JWT_SECRET=PASTE_JWT_SECRET
KYC_ENCRYPTION_KEY=PASTE_KYC_KEY
CORS_ORIGINS=http://13.207.94.31:8081
LMS_STORAGE_DIR=/var/lib/lms/uploads
LMS_ZONE=Asia/Kolkata
LMS_DEMO_SEED=true
MAIL_RESET_URL=http://13.207.94.31:8081/reset-password
SERVER_ADDRESS=127.0.0.1
PORT=4000

# Email for "Forgot password", sent from Gmail (see "Gmail App Password" below)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=kskasianand@gmail.com
MAIL_PASSWORD=PASTE_GMAIL_APP_PASSWORD
MAIL_FROM=Finance Easy <kskasianand@gmail.com>

# Optional: the analytics assistant
# ANTHROPIC_API_KEY=
```

```bash
sudo chmod 600 /etc/lms/lms.env
```

#### Gmail App Password

Gmail does not accept the account's normal password from apps. Create an App Password for
`kskasianand@gmail.com` and put **only that** in `MAIL_PASSWORD`:

1. Sign in at <https://myaccount.google.com> as kskasianand@gmail.com.
2. *Security → 2-Step Verification*: turn it on if it is off (App Passwords need it).
3. Open <https://myaccount.google.com/apppasswords>, name it `Finance Easy server`, and
   **Create**.
4. Copy the 16-letter password into `MAIL_PASSWORD` **without the spaces**
   (`abcd efgh ijkl mnop` → `abcdefghijklmnop`).

Never put the App Password in this file or anywhere in the project; it lives only in
`/etc/lms/lms.env` on the server. To revoke it later, delete it on the same App Passwords page.
Gmail sends at most about 500 emails a day from one account, plenty for password resets.

- `LMS_DEMO_SEED=true` loads the demo branch only when the database has no company yet, so it
  is safe to leave on; it never touches existing data.
- `SERVER_ADDRESS=127.0.0.1` makes the API reachable only through nginx.
- Do **not** set `SPRING_PROFILES_ACTIVE=dev`: that profile uses a built-in, publicly known KYC
  key, returns password-reset tokens in the API response (so anyone could reset any password),
  and accepts calls from any website.

### g. API service

```bash
sudo nano /etc/systemd/system/lms.service
```

```ini
[Unit]
Description=Finance Easy API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=lms
EnvironmentFile=/etc/lms/lms.env
WorkingDirectory=/opt/lms
ExecStart=/usr/bin/java -Xms256m -Xmx512m -jar /opt/lms/lms.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lms
sudo journalctl -u lms -f      # wait for "Started LmsApiApplication", then Ctrl+C
curl -s http://127.0.0.1:4000/health          # {"ok":true}
```

Startup takes up to about a minute; the first start also creates the tables and the demo data.

### h. Web app and nginx

```bash
sudo mkdir -p /var/www/lms
sudo cp -r /tmp/lms-web/* /var/www/lms/
sudo nano /etc/nginx/sites-available/lms
```

```nginx
server {
    listen 8081;
    server_name _;
    root /var/www/lms;
    index index.html;

    # KYC photos: the API allows 5 MB per photo and 12 MB per request. Nginx lets larger
    # uploads through so the API can answer with a clear "file too large" message.
    client_max_body_size 25m;

    # Single-page app: paths such as /customers or /loans/... load index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # The AI assistant streams its answer for up to 5 minutes.
        proxy_buffering off;
        proxy_read_timeout 5m;
    }

    location = /health {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
sudo nginx -t && sudo systemctl reload nginx
```

This adds a second site; NoQ's site on port 80 is untouched.

## 3. Check it

1. Open **`http://13.207.94.31:8081`** in a browser.
2. Sign in as **`admin@demo.lms`** / **`Demo@12345`**. Other demo accounts use the same password:
   `anitha@demo.lms` (manager), and the loan officers `saravanan@`, `priya@`, `vetrivel@` and
   `kalaiselvi@demo.lms`.
3. Open a customer, add an identity proof with a photo, and check the photo shows again after
   a reload: uploads work.
4. **Mobile app, for testing:** start Expo pointed at the server, then open it in Expo Go:
   ```bash
   EXPO_PUBLIC_API_URL=http://13.207.94.31:8081 npm --prefix apps/mobile start
   ```

The demo password is in the source code, so anyone who finds the address can sign in. Fine for
a test server; before real data goes in, change every demo user's password (or start over with
an empty database and `LMS_DEMO_SEED=false`) and add HTTPS.

## Updating

On the server, clear last time's upload first: `rm -rf /tmp/lms.jar /tmp/lms-web`. Build and
upload again as in [step 1](#1-on-your-computer-build-and-upload), then:

```bash
# API: database changes (Flyway migrations) apply on start
sudo cp /opt/lms/lms.jar /opt/lms/lms.jar.previous     # to roll back if needed
sudo mv /tmp/lms.jar /opt/lms/lms.jar && sudo chown lms:lms /opt/lms/lms.jar
sudo systemctl restart lms

# Web app
sudo rm -rf /var/www/lms/* && sudo cp -r /tmp/lms-web/* /var/www/lms/
```

Take a backup (below) before updating the API. To roll back the code,
`sudo mv /opt/lms/lms.jar.previous /opt/lms/lms.jar && sudo systemctl restart lms`; if the
update changed the database, restore the backup too.

## Backups

The database and the uploaded photos belong together; back up both, nightly, keeping seven days:

```bash
sudo mkdir -p /var/backups/lms && sudo chown postgres /var/backups/lms
echo '0 2 * * * postgres pg_dump -Fc lms > /var/backups/lms/lms-$(date +\%a).dump' | sudo tee /etc/cron.d/lms-backup
echo '15 2 * * * root tar -czf /var/backups/lms/uploads-$(date +\%a).tgz -C /var/lib/lms uploads' | sudo tee -a /etc/cron.d/lms-backup
```

To restore: stop the API, then
`sudo -u postgres pg_restore --clean -d lms /var/backups/lms/lms-Mon.dump` and
`sudo tar -xzf /var/backups/lms/uploads-Mon.tgz -C /var/lib/lms && sudo chown -R lms:lms /var/lib/lms`.
A restored database is only readable with the **same `KYC_ENCRYPTION_KEY`**. Copy backups off
the server now and then (e.g. to S3).

## Things to know

- **Plain http.** Browsers mark the site "Not secure", and staff passwords travel unencrypted.
  For real use, add a domain and HTTPS as in NoQ's guide (certbot), then update
  `CORS_ORIGINS`, `MAIL_RESET_URL` and the web build's `VITE_API_URL` to the `https://` address.
- **Mobile release builds** (the signed APK) block plain `http://` by default; they need HTTPS.
- **Password reset email** goes out from kskasianand@gmail.com. To test it, use *Forgot
  password* on the sign-in page with an account whose email you can read: the demo users'
  `@demo.lms` addresses don't exist. If nothing arrives, `sudo journalctl -u lms -n 50` shows the
  SMTP error; `535 Username and Password not accepted` means the App Password is wrong or has
  spaces in it.
- **If the IP changes:** rebuild the web app with the new address, update `CORS_ORIGINS` and
  `MAIL_RESET_URL`, and restart the API.

## Troubleshooting

| Symptom | Check |
|---|---|
| `http://13.207.94.31:8081` doesn't open | Security group allows 8081; `sudo nginx -t`; `sudo ss -ltn \| grep 8081` |
| `502 Bad Gateway` | API not running or still starting (give it a minute): `sudo journalctl -u lms -n 50`. A wrong `DB_PASSWORD` is the usual failure |
| API fails with a `KYC_ENCRYPTION_KEY` / encryption error | The key is missing or not valid Base64 of 32 bytes: regenerate with `openssl rand -base64 32` (only on a fresh database) |
| Sign-in works but every request fails | `CORS_ORIGINS` must match the browser's address exactly: `http://13.207.94.31:8081` |
| Photo upload fails | `client_max_body_size` in the nginx site; folder owned by `lms`: `sudo chown -R lms:lms /var/lib/lms` |
| ID numbers show as unreadable after a restore | `KYC_ENCRYPTION_KEY` differs from the one used when they were saved |
| An app gets killed, or everything is slow | Out of memory with two Java apps: check `free -h`, add swap (2c), or use a larger instance |

Logs: `sudo journalctl -u lms` (API), `/var/log/nginx/error.log` (nginx).
