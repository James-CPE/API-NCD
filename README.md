## API NCD

- [@Rodriguez](https://github.com/James-CPE/API-NCD)

## How to use update code from github manual

Direct to directory project

```bash
cd /var/www/api/API-NCD
```

Pull lastest version code from github

```bash
git pull origin main
```

Restart application with PM2

```bash
pm2 restart api-ncd
```

## How to see log API

Log API (Node.js/PM2)

```bash
pm2 logs api-ncd --lines 50
```

Log Apache

```bash
sudo tail -f /var/log/httpd/access_log
```

Log error Apache
```bash
sudo tail -f /var/log/httpd/error_log
```

