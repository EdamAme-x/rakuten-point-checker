import ReadLine from "readline";

export class inputManager {
  text: string = "";
  constructor(text) {
    this.text = text;
  }

  getText() {
    return this.text;
  }

  async waitInput(): Promise<string> {
    const rl = ReadLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(this.text, (input) => {
        rl.close();
        resolve(input.trim().replace(/\n/gm, ""));
      });
    });
  }
}
