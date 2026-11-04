import ts from "typescript";

/** Ignore formatting and comments while preserving actual code and string values. */
export function sourceTokens(source) {
  const tree = ts.createSourceFile(
    "guard.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const tokens = [];
  function visit(node) {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode)
      return;
    if (ts.isStringLiteral(node)) {
      tokens.push(JSON.stringify(node.text));
      return;
    }
    const children = node.getChildren(tree);
    if (children.length) children.forEach(visit);
    else tokens.push(node.getText(tree));
  }
  visit(tree);
  return tokens.join("");
}
