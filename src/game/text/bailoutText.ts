export function getBailoutStoryText(anchorName: string, amount: number): string {
  return `${anchorName} 把一小袋钱按在柜台上，低声说：「店还没真正转起来，别硬撑。这些你先拿着，把下一批委托发出去。」\n\n她推过来 ${amount} 钱，等你决定是否收下。`;
}
