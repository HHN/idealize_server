export const configuration = () => ({
    NODE_ENV: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10) || 6000,
    jwt: {
        secret: process.env.JWT_SECRET,
        adminSecret: process.env.JWT_ADMIN_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    },
    mongodb: {
        url: process.env.MONGODB_URI,
    },
    swagger: {
        username: process.env.SWAGGER_USERNAME,
        password: process.env.SWAGGER_PASSWORD,
    },
    uploadPath: process.env.UPLOAD_PATH,
    mailgun: {
        domain: process.env.MAILGUN_DOMAIN,
        api: process.env.MAILGUN_API_KEY,
        from: process.env.MAILGUN_FROM
    },
    chatbot: {
        url: process.env.CHAT_BOT_ENDPOINT_URL
    }
});