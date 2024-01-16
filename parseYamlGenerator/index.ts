export async function parseGenerator(
    generator: Generator<any, void, unknown>,
): Promise<any> {
    let generatorResult: string = "";

    for await (const chunk of generator) {
        generatorResult += chunk;
    }

    return JSON.parse(generatorResult);
}