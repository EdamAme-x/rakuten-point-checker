import Enogu from "enogu";

export class loggerMessage {
  constructor(private enogu) {}

  welcome() {
    console.log(
      `${this.enogu.yellow("Rakuten Point Checker")} ${this.enogu.green("v1.0")}`,
    );
  }

  blank() {
    console.log("\n");
  }

  showOptions() {
    console.log(`${this.enogu.green("[\\]")} ${this.enogu.white("Options")}`);
    console.log(
      `${this.enogu.green(" 1 ")} ${this.enogu.white("Stand-alone point check")}`,
    );
    console.log(
      `${this.enogu.green(" 2 ")} ${this.enogu.white("Combo file point check")}`,
    );
    console.log(`${this.enogu.green(" 3 ")} ${this.enogu.white("Exit")}`);
  }
}
