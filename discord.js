export default async function handler(req, res) {
    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI
    } = process.env;

    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({
            success: false,
            message: "Missing OAuth code."
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

        const tokenText =
            await tokenResponse.text();

        let tokenData;

        try {
            tokenData = JSON.parse(tokenText);
        } catch {
            tokenData = {
                raw: tokenText
            };
        }

        if (!tokenResponse.ok) {
            return res.status(502).json({
                success: false,
                message: "Discord rejected the token request.",
                discord_http: tokenResponse.status,
                discord_response: tokenData,
                redirect_uri_used:
                    DISCORD_REDIRECT_URI,
                has_client_id:
                    !!DISCORD_CLIENT_ID,
                has_client_secret:
                    !!DISCORD_CLIENT_SECRET
            });
        }

        if (!tokenData.access_token) {
            return res.status(502).json({
                success: false,
                message: "Discord did not return an access token.",
                discord_response: tokenData
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

        const userData =
            await userResponse.json();

        if (!userResponse.ok) {
            return res.status(502).json({
                success: false,
                message: "Discord user request failed.",
                discord_http:
                    userResponse.status,
                discord_response:
                    userData
            });
        }

        let avatarURL = "";

        if (userData.avatar) {
            avatarURL =
                `https://cdn.discordapp.com/avatars/` +
                `${userData.id}/` +
                `${userData.avatar}.png?size=256`;
        }

        return res.status(200).json({
            success: true,
            state: state || "",
            user: {
                id: userData.id,
                username: userData.username || "",
                displayName:
                    userData.global_name ||
                    userData.username ||
                    "",
                avatarURL
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "OAuth backend error.",
            error: error.message
        });
    }
}
