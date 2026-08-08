export default async function handler(req, res) {
    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI
    } = process.env;

    const code = req.query.code;
    const state = req.query.state;

    if (!code) {
        return res.status(400).json({
            success: false,
            message: "Missing OAuth code."
        });
    }

    if (
        !DISCORD_CLIENT_ID ||
        !DISCORD_CLIENT_SECRET ||
        !DISCORD_REDIRECT_URI
    ) {
        return res.status(500).json({
            success: false,
            message: "OAuth environment variables are missing."
        });
    }

    try {
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: DISCORD_REDIRECT_URI
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            return res.status(502).json({
                success: false,
                message: "Discord rejected the token request.",
                discord_http: tokenResponse.status,
                discord_response: tokenData
            });
        }

        if (!tokenData.access_token) {
            return res.status(502).json({
                success: false,
                message: "Discord did not return an access token."
            });
        }

        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const user = await userResponse.json();

        if (!userResponse.ok || !user.id) {
            return res.status(502).json({
                success: false,
                message: "Unable to retrieve Discord user.",
                discord_http: userResponse.status
            });
        }

        let avatarURL = "";

        if (user.avatar) {
            avatarURL =
                `https://cdn.discordapp.com/avatars/` +
                `${user.id}/${user.avatar}.png?size=256`;
        }

        return res.status(200).json({
            success: true,
            state: state || "",
            user: {
                id: user.id,
                username: user.username || "",
                displayName:
                    user.global_name ||
                    user.username ||
                    "",
                avatarURL
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "OAuth backend error."
        });
    }
}
