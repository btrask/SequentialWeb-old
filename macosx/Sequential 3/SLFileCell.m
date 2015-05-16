#import "SLFileCell.h"

static NSRect SLIconRect(NSRect const r)
{
	NSRect i = NSInsetRect(r, 0.0, 2.0);
	i.size.width = NSHeight(i);
	return i;
}
static NSRect SLTitleRect(NSRect const r)
{
	NSRect const i = SLIconRect(r);
	NSRect t = NSInsetRect(NSMakeRect(NSMaxX(i), NSMinY(i), NSWidth(r) - NSWidth(i), 19.0), 8.0, 0.0);
	t.origin.y += 12.0;
	return t;
}
static NSRect SLPathRect(NSRect const r)
{
	NSRect const t = SLTitleRect(r);
	NSRect p = t;
	p.origin.y = NSMaxY(t) + 2.0;
	p.size.height = 13.0;
	return p;
}

@implementation SLFileCell

#pragma mark -NSCell

+ (BOOL)prefersTrackingUntilMouseUp
{
	return NO;
}

#pragma mark -NSCell

- (void)drawInteriorWithFrame:(NSRect const)rect inView:(NSView *const)view
{
}
- (void)drawWithFrame:(NSRect const)rect inView:(NSView *const)view
{
	[[NSColor redColor] set];
//	NSFrameRect(SLIconRect(rect));
//	NSFrameRect(SLTitleRect(rect));
//	NSFrameRect(SLPathRect(rect));
	NSString *const p = [self stringValue];
	[[[NSWorkspace sharedWorkspace] iconForFile:p] drawInRect:SLIconRect(rect) fromRect:NSZeroRect operation:NSCompositeSourceOver fraction:1.0 respectFlipped:YES hints:nil];
	BOOL const selected = [self isHighlighted];
	NSShadow *const shadow = [[[NSShadow alloc] init] autorelease];
	[shadow setShadowBlurRadius:1.0];
	[shadow setShadowOffset:NSMakeSize(0, -1.0)];
	[shadow setShadowColor:[NSColor blackColor]];
	NSMutableParagraphStyle *const style = [[[NSParagraphStyle defaultParagraphStyle] mutableCopy] autorelease];
	[style setTighteningFactorForTruncation:0.05];
	[style setLineBreakMode:NSLineBreakByTruncatingMiddle];
	[SLDisplayName(p) drawInRect:SLTitleRect(rect) withAttributes:[NSDictionary dictionaryWithObjectsAndKeys:
		style, NSParagraphStyleAttributeName,
		selected ? [NSFont boldSystemFontOfSize:14.0] : [NSFont systemFontOfSize:14.0], NSFontAttributeName,
		selected ? [NSColor whiteColor] : [NSColor blackColor], NSForegroundColorAttributeName,
		selected ? shadow : nil, NSShadowAttributeName,
		nil]];
/*	[[p stringByDeletingLastPathComponent] drawInRect:SLPathRect(rect) withAttributes:[NSDictionary dictionaryWithObjectsAndKeys:
		style, NSParagraphStyleAttributeName,
		selected ? [NSFont boldSystemFontOfSize:11.0] : [NSFont systemFontOfSize:11.0], NSFontAttributeName,
		selected ? [NSColor whiteColor] : [NSColor grayColor], NSForegroundColorAttributeName,
		selected ? shadow : nil, NSShadowAttributeName,
		nil]];*/
}
- (void)highlight:(BOOL const)flag withFrame:(NSRect const)rect inView:(NSView *const)view
{
	NSLog(@"highlight");
}

- (BOOL)trackMouse:(NSEvent *)theEvent inRect:(NSRect)cellFrame ofView:(NSView *)controlView untilMouseUp:(BOOL)flag;
{
	if(2 != [theEvent clickCount]) return NO;
	[self performClick:nil];
	return YES;
}


@end
