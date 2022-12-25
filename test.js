function padString(str) {
  const buf = Buffer.from(str, "utf-8");
  return Buffer.concat([
    buf,
    Buffer.from("\0".repeat(4 - (buf.byteLength & 3))),
  ]);
}

function scanPacket(name) {
  const padName = padString(name);
  const nameLength = padName.byteLength;

  return Buffer.concat([
    // Buffer.from([0xc8 + nameLength, 0x00, 0x00, 0x00]),
    // Buffer.from([
    //   0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0c, 0x00, 0x04, 0x00,
    //   0x00, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x70, 0x04, 0x00, 0x00,
    // ]),
    // Buffer.from([0xac + nameLength]),
    // Buffer.from([
    //   0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x04,
    //   0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x0a,
    //   0x00, 0x00, 0x00, 0x39, 0x01, 0x00, 0x00,
    // ]),
    // Buffer.from([0x8c + nameLength]),
    // Buffer.from([
    //   0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x30,
    //   0x00, 0x04, 0x00, 0x08, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x14, 0x00, 0x18,
    //   0x00, 0x1c, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x24, 0x00, 0x28,
    //   0x00, 0x2c, 0x00, 0x1e, 0x00, 0x00, 0x00,
    // ]),

    // {
    /*included*/ Buffer.from([0x4c + nameLength]),
    /**/ Buffer.from([0x00, 0x00, 0x00, 0x61, 0xae, 0x0a, 0x00]), //8
    /**/ Buffer.from([0x30 + nameLength, 0x00, 0x00, 0x00]), // 12
    /**/ Buffer.from([0x0b + ~~(nameLength / 4)]), // 13
    /**/ Buffer.from([
      /**/ 0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
      /**/ 0x5a, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x15, 0x00, 0x00,
      /**/ 0x00, 0x0a, 0x00, 0x00, 0x00, 0xe8, 0x03, 0x00, 0x00, 0x00, 0x00,
      /**/ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]), // 52
    /**/
    /**/ Buffer.from([Buffer.from(name, "utf-8").byteLength, 0x00, 0x00, 0x00]), // 56
    /**/ padString(name), // byteLength + 56
    /**/
    /**/ // Padding String: DummyAuthTicket
    /**/ Buffer.from([0x0f, 0x00, 0x00, 0x00]), // b+60
    /**/ padString("DummyAuthTicket"), // b+76

    //}

    // Buffer.from([0x11, 0x00, 0x00, 0x00]),
    // padString("42945816079448220"),
  ]);
}

console.log(scanPacket("ABC").toString("base64"));
