from google_auth_oauthlib.flow import Flow

flow = Flow.from_client_config(
    {"web": {"client_id": "1", "client_secret": "2", "auth_uri": "a", "token_uri": "b", "redirect_uris": ["c"]}},
    scopes=["openid"],
    redirect_uri="c"
)
auth_url, state = flow.authorization_url(prompt="consent")
print("Auth URL:", auth_url)
print("Code verifier:", getattr(flow, "code_verifier", None))
