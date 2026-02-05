import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { parseProfile } from '@/lib/sourcing/parsers';
import { detectPlatform, isValidUrl } from '@/lib/sourcing/platform-detector';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        {
          error: 'Platform not supported',
          message: 'Supported platforms: LinkedIn, DOU, Djinni, Work.ua, GitHub'
        },
        { status: 400 }
      );
    }

    console.log(`Parsing ${platform} profile: ${url}`);

    const result = await parseProfile(url);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to parse profile',
          platform
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      platform,
      profile: result.profile,
    });
  } catch (error) {
    console.error('Error in POST /api/sourcing/parse-profile:', error);
    return NextResponse.json(
      { error: 'Failed to parse profile' },
      { status: 500 }
    );
  }
}
