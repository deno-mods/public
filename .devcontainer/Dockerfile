ARG DENO_VERSION=1.37.2

FROM denoland/deno:alpine-${DENO_VERSION}

RUN deno --version

# [Option] Install zsh
ARG INSTALL_ZSH="true"

# Install needed packages and setup non-root user. 
COPY library-scripts/*.sh library-scripts/*.env /tmp/library-scripts/
RUN apk update && ash /tmp/library-scripts/common-alpine.sh "${INSTALL_ZSH}" "${USERNAME}" "${USER_UID}" "${USER_GID}" \
    && rm -rf /tmp/library-scripts

#Use a separate RUN statement to add your own dependencies.
# ** [Optional] Uncomment this section to install additional packages. **
# RUN apk update \
#     && apk add --no-cache <your-package-list-here>
