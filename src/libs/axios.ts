import { request } from "https";

interface HttpResponse {
  data: any;
}

async function get(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: "GET",
    };

    const req = request(options, (res) => {
      res.setEncoding("utf8");
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve({ data: JSON.parse(responseBody) });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

export { get };
