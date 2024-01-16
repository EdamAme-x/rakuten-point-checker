import ReadLine from "readline";

export class inputManager {
  private reader: ReadLine.Interface;

  constructor(private text: string) {
    const reader = ReadLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.reader = reader;
  }

  getText() {
    return this.text;
  }

  waitInput(): Promise<string> {
    return new Promise((resolve) => {
      this.reader.question(this.text, resolve);
    });
  }
}
