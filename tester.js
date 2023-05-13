(() => {
  const isRecord = (obj) => obj instanceof Object;

  function validateEvent(event) {
    debugger;
    if (!isRecord(event)) return false;
    if (typeof event.kind !== "number") return false;
    if (typeof event.content !== "string") return false;
    if (typeof event.created_at !== "number") return false;
    if (typeof event.pubkey !== "string") return false;
    if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return "match";

    if (!Array.isArray(event.tags)) return "tags";
    for (let i = 0; i < event.tags.length; i++) {
      let tag = event.tags[i];
      if (!Array.isArray(tag)) return "isArray";
      for (let j = 0; j < tag.length; j++) {
        if (typeof tag[j] === "object") return "object";
      }
    }

    return true;
  }

  const e = {
    kind: 802,
    pubkey: "d5e19bcba9c3442bae90beea0dee2e5760177ee7ac5d4196118e657bbb302141",
    created_at: 1683987421,
    tags: [
      ["n", "mainnet"],
      ["t", "sell"],
      [
        "i",
        "a708ec23d9e26ef43b9819ead68446e152e2a38f061495cd0ba7f6b91a8ffd8ai0",
      ],
      [
        "u",
        "cf726c0c181165aa7c0774d0c9c26f86c8787d19d23ef0d2345783a031b94932:0",
      ],
      ["s", "10000"],
      ["x", "deezy"],
    ],
    content:
      "cHNidP8BAF4CAAAAATJJuTGgg1c00vA+0hl9eMiGb8LJ0HQHfKplERgMbHLPAAAAAAD/////ARAnAAAAAAAAIlEg1eGby6nDRCuukL7qDe4uV2AXfuesXUGWEY5le7swIUEAAAAAAAEAsgIAAAACHi1Ite9vZMqxpIGaV3ew/Ocpe6YkZCA5aU68OLcpWakAAAAAAP////9ucdQ3s6siS1v3fz+h7hiYpue153BocuFzCA6/SqKyTAAAAAAA/////wIQJwAAAAAAACJRINXhm8upw0QrrpC+6g3uLldgF37nrF1BlhGOZXu7MCFBUpN6AAAAAAAiUSBUAdlWlRChrV2WHhDUCeQ21zcURO1kCtbtiUDUfNvN+gAAAAABASsQJwAAAAAAACJRINXhm8upw0QrrpC+6g3uLldgF37nrF1BlhGOZXu7MCFBAQhDAUHMw0lKX7UNyxCGiPlFBkSw/XsOqD+8rvOUwXBRCQurmnzUSYMaqSrXI4zTw16AYxhdUCpPAneQ//WmMpA9R0JRgwAA",
  };

  const status = validateEvent(e);
  console.log(status);
})();
