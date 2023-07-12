# Octoneko

A smart cat that can push releases to your telegram!

Proudly using [NekoPush](https://github.com/MeowBot233/NekoPush)

# Usage

1. Clone this project.
2. `npm install`
3. `npx wrangler kv:namespace create octoneko`
4. replace `id` in `wrangler.toml` with your kv id.
5. `npx wrangler kv:key put repos <repos you want to watch> --binding octoneko` replace `<repos you want to watch>` to repo urls. Use \n to seperate. You can also edit this on your cloudflare dashboard.
6. `echo <token> | npx wrangler secret put pushToken` replace `<token>` with your NekoPush token.
7. (optional)`echo <pushThreadID> | npx wrangler secret put pushThreadID` replace `<pushThreadID>` with your group thread ID, *if you need it*.
8. `npx wrangler deploy` and enjoy!
